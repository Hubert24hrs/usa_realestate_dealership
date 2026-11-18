import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { pointInPolygon, ringBounds, type LngLat } from "@/lib/geo";
import { PAGE_SIZE, type SearchFilters } from "@/lib/search/filters";
import type { SearchFacets, SearchResult, Suggestion } from "@/lib/search/types";
import { cardSelect, pointSelect, toCardData, toMapPoint } from "./card";
import { resolvePlace } from "./places";
import type { SearchProvider } from "./provider";
import { hasPostgis, idsWithinPolygon } from "./spatial";
import { buildOrderBy, buildWhere } from "./where";

const MAX_POINTS = 2000;

export class PostgresSearchProvider implements SearchProvider {
  readonly id = "postgres";

  async search(filters: SearchFilters, options: { pageSize?: number; withPoints?: boolean; withFacets?: boolean } = {}): Promise<SearchResult> {
    const started = Date.now();
    const now = new Date();
    const pageSize = options.pageSize ?? PAGE_SIZE;
    const place = await resolvePlace(filters.place);
    let where: Prisma.ListingWhereInput = buildWhere(filters, place, now);
    let spatial: SearchResult["spatial"] = "none";

    if (filters.polygon) {
      const ring = filters.polygon as LngLat[];
      if (await hasPostgis()) {
        const ids = await idsWithinPolygon(ring);
        where = { AND: [where, { id: { in: ids } }] };
        spatial = "postgis";
      } else {
        const [w, s, e, n] = ringBounds(ring);
        const candidates = await db.listing.findMany({
          where: { AND: [where, { lat: { gte: s, lte: n }, lng: { gte: w, lte: e } }] },
          select: { id: true, lat: true, lng: true },
          take: 10_000,
        });
        const ids = candidates.filter((c) => pointInPolygon([c.lng, c.lat], ring)).map((c) => c.id);
        where = { AND: [where, { id: { in: ids } }] };
        spatial = "fallback";
      }
    }

    const page = Math.max(1, filters.page);
    const [total, rows, pointRows, facets] = await Promise.all([
      db.listing.count({ where }),
      db.listing.findMany({ where, orderBy: buildOrderBy(filters), skip: (page - 1) * pageSize, take: pageSize, select: cardSelect(now) }),
      options.withPoints === false ? Promise.resolve([]) : db.listing.findMany({ where, select: pointSelect, take: MAX_POINTS, orderBy: { price: "desc" } }),
      options.withFacets === false ? Promise.resolve(emptyFacets()) : this.facets(where),
    ]);

    const points = pointRows.map(toMapPoint);
    let bbox: SearchResult["bbox"] = null;
    if (points.length) {
      bbox = ringBounds(points.map((p) => [p.lng, p.lat] as LngLat));
    } else if (place?.bbox) {
      bbox = place.bbox;
    }

    return {
      results: rows.map(toCardData),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      points,
      facets,
      bbox,
      spatial,
      provider: this.id,
      tookMs: Date.now() - started,
    };
  }

  private async facets(where: Prisma.ListingWhereInput): Promise<SearchFacets> {
    const [types, beds, stats] = await Promise.all([
      db.listing.groupBy({ by: ["propertyType"], where, _count: { _all: true } }),
      db.listing.groupBy({ by: ["beds"], where, _count: { _all: true } }),
      db.listing.aggregate({ where, _min: { price: true }, _max: { price: true }, _count: { _all: true } }),
    ]);
    let median: number | null = null;
    if (stats._count._all > 0) {
      const mid = await db.listing.findMany({ where, orderBy: { price: "asc" }, skip: Math.floor(stats._count._all / 2), take: 1, select: { price: true } });
      median = mid[0]?.price ?? null;
    }
    return {
      propertyTypes: types.map((t) => ({ value: t.propertyType, count: t._count._all })).sort((a, b) => b.count - a.count),
      beds: beds.filter((b) => b.beds != null).map((b) => ({ value: b.beds!, count: b._count._all })).sort((a, b) => a.value - b.value),
      priceStats: stats._min.price != null && stats._max.price != null && median != null ? { min: stats._min.price, max: stats._max.price, median } : null,
    };
  }

  async suggest(query: string, limit = 10): Promise<Suggestion[]> {
    return suggestFromDb(query, limit);
  }
}

function emptyFacets(): SearchFacets {
  return { propertyTypes: [], beds: [], priceStats: null };
}

/** Autosuggest across cities, neighborhoods, ZIPs, states, schools, addresses, MLS # and agents. */
export async function suggestFromDb(raw: string, limit = 10): Promise<Suggestion[]> {
  const q = raw.trim().slice(0, 80);
  if (q.length < 2) return [];
  const contains = { contains: q, mode: "insensitive" as const };
  const isZip = /^\d{2,5}$/.test(q);
  const looksMls = /^(demo-?)?\d{3,}$/i.test(q);

  const [cities, hoods, states, schools, listings, agents, zips] = await Promise.all([
    db.city.findMany({ where: { name: contains }, take: 5, select: { name: true, stateCode: true, slug: true, _count: { select: { listings: true } } } }),
    db.neighborhood.findMany({ where: { name: contains }, take: 5, select: { name: true, slug: true, city: { select: { name: true, stateCode: true, slug: true } } } }),
    db.state.findMany({ where: { name: { startsWith: q, mode: "insensitive" } }, take: 2, select: { name: true, slug: true } }),
    db.school.findMany({ where: { name: contains }, take: 3, select: { name: true, slug: true, rating: true, grades: true, city: { select: { name: true, stateCode: true, slug: true } } } }),
    db.listing.findMany({
      where: looksMls ? { mlsNumber: { contains: q.replace(/^demo-?/i, ""), mode: "insensitive" } } : { OR: [{ streetAddress: contains }, { communityName: contains }] },
      take: 4,
      select: { slug: true, streetAddress: true, city: true, state: true, zip: true, mlsNumber: true, communityName: true, hideAddress: true },
    }),
    db.agent.findMany({ where: { name: contains }, take: 3, select: { name: true, slug: true, title: true, organization: { select: { name: true } } } }),
    isZip
      ? db.listing.findMany({ where: { zip: { startsWith: q } }, distinct: ["zip"], take: 4, select: { zip: true, city: true, state: true } })
      : Promise.resolve([]),
  ]);

  const out: Suggestion[] = [
    ...cities.map((c) => ({ type: "city" as const, label: `${c.name}, ${c.stateCode}`, sublabel: `${c._count.listings} listings`, place: c.slug })),
    ...hoods.map((h) => ({ type: "neighborhood" as const, label: h.name, sublabel: `Neighborhood · ${h.city.name}, ${h.city.stateCode}`, place: `${h.city.slug}/${h.slug}` })),
    ...zips.map((z) => ({ type: "zip" as const, label: z.zip, sublabel: `ZIP · ${z.city}, ${z.state}`, place: z.zip })),
    ...states.map((s) => ({ type: "state" as const, label: s.name, sublabel: "State", place: s.slug })),
    ...schools.map((s) => ({ type: "school" as const, label: s.name, sublabel: `School · ${s.grades} · ${s.rating}/10 · ${s.city.name}`, href: `/homes-for-sale/${s.city.slug}?school=${s.slug}` })),
    ...listings
      .filter((l) => !l.hideAddress)
      .map((l) => ({
        type: (looksMls ? "mls" : "address") as "mls" | "address",
        label: l.communityName ?? l.streetAddress,
        sublabel: `${looksMls ? `MLS# ${l.mlsNumber} · ` : ""}${l.city}, ${l.state} ${l.zip}`,
        href: `/property/${l.slug}`,
      })),
    ...agents.map((a) => ({ type: "agent" as const, label: a.name, sublabel: `Agent · ${a.organization?.name ?? a.title ?? ""}`, href: `/agents/${a.slug}` })),
  ];
  return out.slice(0, limit);
}
