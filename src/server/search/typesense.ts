import "server-only";
import Typesense from "typesense";
import { db } from "@/lib/db";
import { PAGE_SIZE, type SearchFilters } from "@/lib/search/filters";
import type { SearchResult, Suggestion } from "@/lib/search/types";
import { cardSelect, toCardData } from "./card";
import { resolvePlace } from "./places";
import { PostgresSearchProvider, suggestFromDb } from "./postgres";
import type { SearchProvider } from "./provider";
import { TYPESENSE_COLLECTION } from "./typesense-schema";

export function typesenseClient() {
  return new Typesense.Client({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST!,
        port: Number(process.env.TYPESENSE_PORT ?? 443),
        protocol: process.env.TYPESENSE_PROTOCOL ?? "https",
      },
    ],
    apiKey: process.env.TYPESENSE_API_KEY!,
    connectionTimeoutSeconds: 5,
  });
}

const DAY = 86_400;
const esc = (v: string) => `\`${v.replace(/`/g, "")}\``;

/** Translate SearchFilters to a Typesense filter_by expression. */
export function toTypesenseFilter(f: SearchFilters, placeIds: { cityId?: string; neighborhoodId?: string; zip?: string; state?: string }, nowSecs: number): string {
  const c: string[] = [];
  const statuses = f.comingSoon === true ? ["COMING_SOON"] : ["ACTIVE", ...(f.comingSoon === false ? [] : ["COMING_SOON"]), ...(f.includePending ? ["PENDING"] : [])];
  switch (f.mode) {
    case "buy":
    case "new":
      c.push("category:=RESIDENTIAL", "transactionType:=SALE", `status:=[${statuses.join(",")}]`);
      if (f.mode === "new") c.push("flags:=new");
      break;
    case "sold":
      c.push("category:=RESIDENTIAL", "status:=SOLD");
      if (f.soldWithinDays) c.push(`soldDate:>=${nowSecs - f.soldWithinDays * DAY}`);
      break;
    case "rent":
      c.push("category:=RENTAL", "status:=ACTIVE");
      break;
    case "commercial":
      c.push("category:=COMMERCIAL", "status:=[ACTIVE,COMING_SOON]");
      if (f.transaction) c.push(`transactionType:=${f.transaction === "lease" ? "LEASE" : "SALE"}`);
      break;
    case "land":
      c.push("category:=LAND", "status:=[ACTIVE,COMING_SOON]");
      break;
  }
  if (!f.bounds && !f.polygon) {
    if (placeIds.neighborhoodId) c.push(`neighborhoodId:=${placeIds.neighborhoodId}`);
    else if (placeIds.cityId) c.push(`cityId:=${placeIds.cityId}`);
    else if (placeIds.zip) c.push(`zip:=${placeIds.zip}`);
    else if (placeIds.state) c.push(`state:=${placeIds.state}`);
  }
  if (f.polygon) c.push(`location:(${f.polygon.map(([lng, lat]) => `${lat}, ${lng}`).join(", ")})`);
  else if (f.bounds) {
    const [w, s, e, n] = f.bounds;
    c.push(`location:(${n}, ${w}, ${n}, ${e}, ${s}, ${e}, ${s}, ${w})`);
  }
  if (f.price?.min != null) c.push(f.mode === "rent" ? `priceMax:>=${f.price.min} || price:>=${f.price.min}` : `price:>=${f.price.min}`);
  if (f.price?.max != null) c.push(`price:<=${f.price.max}`);
  if (f.bedsMin) c.push(`beds:>=${f.bedsMin}`);
  if (f.bathsMin) c.push(`baths:>=${f.bathsMin}`);
  if (f.homeTypes?.length) c.push(`propertyType:=[${f.homeTypes.map(esc).join(",")}]`);
  const rng = (field: string, r?: { min?: number; max?: number }) => {
    if (r?.min != null) c.push(`${field}:>=${r.min}`);
    if (r?.max != null) c.push(`${field}:<=${r.max}`);
  };
  rng("sqft", f.sqft);
  rng("lotSqft", f.lotSqft);
  rng("yearBuilt", f.yearBuilt);
  rng("lotAcres", f.acres);
  if (f.hoaMax != null) c.push(`hoaFee:<=${f.hoaMax}`);
  if (f.garageMin) c.push(`garageSpaces:>=${f.garageMin}`);
  if (f.singleStory) c.push("stories:<=1");
  const flag = (on: boolean | undefined, name: string) => on && c.push(`flags:=${name}`);
  flag(f.pool, "pool");
  flag(f.waterfront, "waterfront");
  flag(f.view, "view");
  flag(f.basement, "basement");
  flag(f.yard, "yard");
  flag(f.foreclosure, "foreclosure");
  flag(f.fsbo, "fsbo");
  flag(f.tour3d, "tour3d");
  flag(f.video, "video");
  flag(f.luxury, "luxury");
  flag(f.water, "water");
  if (f.newConstruction && f.mode !== "new") c.push("flags:=new");
  if (f.pets) c.push(`flags:=${f.pets === "any" ? "pets" : f.pets}`);
  if (f.daysOnMarketMax) c.push(`listDate:>=${nowSecs - f.daysOnMarketMax * DAY}`);
  if (f.openHouse) c.push(`nextOpenHouse:>=${nowSecs}`);
  if (f.priceReduced) c.push(`priceReducedAt:>=${nowSecs - 120 * DAY}`);
  if (f.schoolRatingMin) c.push(`bestSchoolRating:>=${f.schoolRatingMin}`);
  if (f.school) c.push(`schoolSlugs:=${esc(f.school)}`);
  if (f.capRateMin != null) c.push(`capRate:>=${f.capRateMin}`);
  if (f.landTypes?.length) c.push(`landTypes:=[${f.landTypes.map(esc).join(",")}]`);
  if (f.activities?.length) c.push(`activities:=[${f.activities.map(esc).join(",")}]`);
  return c.join(" && ");
}

const SORT_BY: Record<string, string> = {
  relevant: "_text_match:desc,isFeatured:desc,listDate:desc",
  newest: "listDate:desc",
  "price-asc": "price:asc",
  "price-desc": "price:desc",
  beds: "beds:desc",
  sqft: "sqft:desc",
  ppsf: "pricePerSqft:asc",
  lot: "lotSqft:desc",
  reduced: "priceReducedAt:desc",
  "sold-recent": "soldDate:desc",
  acres: "lotAcres:desc",
  "cap-rate": "capRate:desc",
};

export class TypesenseSearchProvider implements SearchProvider {
  readonly id = "typesense";
  private readonly client = typesenseClient();
  private readonly pg = new PostgresSearchProvider();

  async search(filters: SearchFilters, options: { pageSize?: number; withPoints?: boolean; withFacets?: boolean } = {}): Promise<SearchResult> {
    const started = Date.now();
    const pageSize = options.pageSize ?? PAGE_SIZE;
    const place = await resolvePlace(filters.place);
    const nowSecs = Math.floor(Date.now() / 1000);
    const filterBy = toTypesenseFilter(
      filters,
      { cityId: place?.cityId, neighborhoodId: place?.type === "neighborhood" ? place.neighborhoodId : undefined, zip: place?.zip, state: place?.type === "state" ? place.stateCode : undefined },
      nowSecs,
    );
    const response = await this.client
      .collections(TYPESENSE_COLLECTION)
      .documents()
      .search({
        q: filters.keywords || (!place && filters.q) || "*",
        query_by: "headline,description,streetAddress,communityName,city,neighborhood,mlsNumber",
        filter_by: filterBy,
        sort_by: SORT_BY[filters.sort] ?? SORT_BY.relevant,
        facet_by: options.withFacets === false ? undefined : "propertyType,beds",
        page: filters.page,
        per_page: pageSize,
        include_fields: "id",
      });
    const ids = (response.hits ?? []).map((h) => (h.document as { id: string }).id);
    const rows = await db.listing.findMany({ where: { id: { in: ids } }, select: cardSelect() });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const results = ids.map((id) => byId.get(id)).filter(Boolean).map((r) => toCardData(r!));
    const facetCounts = response.facet_counts ?? [];
    const facet = (field: string) => facetCounts.find((fc) => fc.field_name === field)?.counts ?? [];

    // Map points + price stats come from Postgres with the same filters (keeps the map complete beyond one page).
    const pg = options.withPoints === false ? null : await this.pg.search({ ...filters, page: 1 }, { pageSize: 1, withFacets: true });
    return {
      results,
      total: response.found,
      page: filters.page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(response.found / pageSize)),
      points: pg?.points ?? [],
      facets: {
        propertyTypes: facet("propertyType").map((c) => ({ value: c.value, count: c.count })),
        beds: facet("beds").map((c) => ({ value: Number(c.value), count: c.count })).sort((a, b) => a.value - b.value),
        priceStats: pg?.facets.priceStats ?? null,
      },
      bbox: pg?.bbox ?? place?.bbox ?? null,
      spatial: "none",
      provider: this.id,
      tookMs: Date.now() - started,
    };
  }

  async suggest(query: string, limit = 10): Promise<Suggestion[]> {
    return suggestFromDb(query, limit);
  }
}
