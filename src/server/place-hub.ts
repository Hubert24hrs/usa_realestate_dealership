import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { SearchMode } from "@/lib/domain";
import { defaultFilters } from "@/lib/search/filters";
import type { ListingCardData } from "@/lib/search/types";
import { MODE_VERTICAL, VERTICAL_BY_SLUG } from "@/lib/search/verticals";
import { getCityMarkets } from "./markets";
import { cardSelect, toCardData } from "./search/card";
import { placeWhere, type ResolvedPlace } from "./search/places";
import { modeWhere } from "./search/where";

export const HUB_MODES: SearchMode[] = ["buy", "rent", "new", "sold", "commercial", "land"];
const DAY = 86_400_000;

/** The listing filter a search page uses for `mode` with no extra filters, so hub counts match search results. */
export const baseModeWhere = (mode: SearchMode, now = new Date()) => modeWhere(defaultFilters(mode), now);

/** The subset of a resolved place the hub needs (small, serializable cache key). */
export interface HubPlace {
  type: ResolvedPlace["type"];
  slug: string;
  label: string;
  shortLabel: string;
  stateCode: string;
  stateName?: string;
  stateSlug?: string;
  citySlug?: string;
  cityName?: string;
  cityId?: string;
  neighborhoodId?: string;
}

export const toHubPlace = (p: ResolvedPlace): HubPlace => ({
  type: p.type,
  slug: p.slug,
  label: p.label,
  shortLabel: p.shortLabel,
  stateCode: p.stateCode,
  stateName: p.stateName,
  stateSlug: p.stateSlug,
  citySlug: p.citySlug,
  cityName: p.cityName,
  cityId: p.cityId,
  neighborhoodId: p.neighborhoodId,
});

export interface PlaceHubData {
  counts: Array<{ mode: SearchMode; vertical: string; title: string; count: number }>;
  stats: { forSale: number; medianPrice: number | null; medianPpsf: number | null; medianRent: number | null; medianDom: number | null; newThisWeek: number; priceCuts: number };
  featured: ListingCardData[];
  rentals: ListingCardData[];
  areas: Array<{ name: string; href: string; detail: string | null; medianPrice: number | null; count: number }>;
  schools: Array<{ name: string; level: string; type: string; rating: number; grades: string }>;
  posts: Array<{ slug: string; title: string; excerpt: string | null; type: "GUIDE" | "LEARN" | "NEWS" | "BLOG"; coverColor: string | null; readingMinutes: number | null; publishedAt: Date | string | null }>;
  city: { description: string | null; population: number | null; colIndex: number | null; seoTitle: string | null; seoDescription: string | null; rentYoY: number | null } | null;
  hood: { description: string | null; highlights: string[]; walkScore: number | null; transitScore: number | null; bikeScore: number | null; cityHref: string } | null;
  stateNotice: string | null;
}

const median = (xs: number[]) => {
  const s = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2);
};

async function buildHub(place: HubPlace): Promise<PlaceHubData> {
  const now = new Date();
  const inPlace = placeWhere(place as ResolvedPlace);
  const buy = { AND: [baseModeWhere("buy", now), inPlace] };
  const rent = { AND: [baseModeWhere("rent", now), inPlace] };

  const [counts, saleRows, rentRows, featuredRows, rentalRows] = await Promise.all([
    Promise.all(
      HUB_MODES.map(async (mode) => {
        const vertical = VERTICAL_BY_SLUG.get(MODE_VERTICAL[mode])!;
        return { mode, vertical: vertical.slug, title: vertical.title, count: await db.listing.count({ where: { AND: [baseModeWhere(mode, now), inPlace] } }) };
      }),
    ),
    db.listing.findMany({ where: buy, select: { price: true, pricePerSqft: true, listDate: true, priceReducedAt: true } }),
    db.listing.findMany({ where: rent, select: { price: true } }),
    db.listing.findMany({ where: buy, orderBy: [{ isFeatured: "desc" }, { listDate: "desc" }], take: 8, select: cardSelect(now) }),
    db.listing.findMany({ where: rent, orderBy: { listDate: "desc" }, take: 8, select: cardSelect(now) }),
  ]);

  const week = now.getTime() - 7 * DAY;
  const stats = {
    forSale: saleRows.length,
    medianPrice: median(saleRows.map((r) => r.price)),
    medianPpsf: median(saleRows.map((r) => r.pricePerSqft ?? 0)),
    medianRent: median(rentRows.map((r) => r.price)),
    medianDom: median(saleRows.map((r) => Math.max(1, Math.round((now.getTime() - r.listDate.getTime()) / DAY)))),
    newThisWeek: saleRows.filter((r) => r.listDate.getTime() >= week).length,
    priceCuts: saleRows.filter((r) => r.priceReducedAt && r.priceReducedAt.getTime() >= now.getTime() - 30 * DAY).length,
  };

  let areas: PlaceHubData["areas"] = [];
  let schools: PlaceHubData["schools"] = [];
  let city: PlaceHubData["city"] = null;
  let hood: PlaceHubData["hood"] = null;
  let stateNotice: string | null = null;
  const citySlug = place.citySlug;

  if (place.type === "state") {
    const [cities, byCity, state] = await Promise.all([
      db.city.findMany({ where: { stateCode: place.stateCode }, orderBy: { population: "desc" }, select: { id: true, name: true, slug: true, medianHomeValue: true, population: true } }),
      db.listing.groupBy({ by: ["cityId"], where: { AND: [baseModeWhere("buy", now), { state: place.stateCode }] }, _count: true }),
      db.state.findUnique({ where: { code: place.stateCode }, select: { notice: true } }),
    ]);
    const count = new Map(byCity.map((r) => [r.cityId, r._count]));
    areas = cities.map((c) => ({ name: c.name, href: `/${c.slug}`, detail: c.population ? `Population ${c.population.toLocaleString("en-US")}` : null, medianPrice: c.medianHomeValue, count: count.get(c.id) ?? 0 }));
    stateNotice = state?.notice ?? null;
  } else if (place.cityId) {
    const [row, hoods, byHood, schoolRows, market] = await Promise.all([
      db.city.findUnique({ where: { id: place.cityId }, select: { description: true, population: true, costOfLivingIndex: true, seoTitle: true, seoDescription: true } }),
      db.neighborhood.findMany({ where: { cityId: place.cityId }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, medianPrice: true, walkScore: true, description: true, highlights: true, transitScore: true, bikeScore: true } }),
      db.listing.groupBy({ by: ["neighborhoodId"], where: { AND: [baseModeWhere("buy", now), { cityId: place.cityId }] }, _count: true }),
      db.school.findMany({ where: { cityId: place.cityId }, orderBy: [{ rating: "desc" }, { name: "asc" }], take: 6, select: { name: true, level: true, type: true, rating: true, grades: true } }),
      citySlug ? getCityMarkets().then((all) => all.find((m) => m.slug === citySlug) ?? null) : Promise.resolve(null),
    ]);
    const count = new Map(byHood.map((r) => [r.neighborhoodId, r._count]));
    city = row
      ? { description: row.description, population: row.population, colIndex: market?.colIndex ?? row.costOfLivingIndex, seoTitle: row.seoTitle, seoDescription: row.seoDescription, rentYoY: market?.rentYoY ?? null }
      : null;
    if (place.type === "neighborhood") {
      const me = hoods.find((h) => h.id === place.neighborhoodId);
      if (me) hood = { description: me.description, highlights: me.highlights, walkScore: me.walkScore, transitScore: me.transitScore, bikeScore: me.bikeScore, cityHref: `/${citySlug}` };
    }
    areas = hoods
      .filter((h) => h.id !== place.neighborhoodId)
      .map((h) => ({ name: h.name, href: `/${citySlug}/${h.slug}`, detail: h.walkScore != null ? `Walk Score® ${h.walkScore}` : null, medianPrice: h.medianPrice, count: count.get(h.id) ?? 0 }));
    schools = schoolRows.map((s) => ({ ...s, level: s.level, type: s.type }));
  }

  const posts = await db.post.findMany({
    where: { status: "PUBLISHED", ...(citySlug ? { OR: [{ citySlug }, { citySlug: null }] } : {}) },
    orderBy: [{ publishedAt: "desc" }],
    take: 12,
    select: { slug: true, title: true, excerpt: true, type: true, coverColor: true, readingMinutes: true, publishedAt: true, citySlug: true },
  });
  // Local guides first, then the newest general ones.
  const sortedPosts = [...posts.filter((p) => p.citySlug), ...posts.filter((p) => !p.citySlug)].slice(0, 3).map(({ citySlug: _c, ...p }) => p);

  return {
    counts,
    stats,
    featured: featuredRows.map(toCardData),
    rentals: rentalRows.map(toCardData),
    areas,
    schools,
    posts: sortedPosts,
    city,
    hood,
    stateNotice,
  };
}

const cachedHub = unstable_cache(buildHub, ["place-hub-v2"], { revalidate: 1800, tags: ["listings", "markets"] });

/** Landing-page data for a state, city or neighborhood (cached; invalidated with listing and market changes). */
export const getPlaceHub = (place: ResolvedPlace) => cachedHub(toHubPlace(place));
