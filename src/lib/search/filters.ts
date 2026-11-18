/**
 * Search filters: one Zod schema shared by the URL, the API and the UI.
 * URLs are SEO-friendly: /{vertical}/{place}?beds=3&price=300000-750000&type=CONDO
 */
import { z } from "zod";
import { SEARCH_MODES, type SearchMode } from "@/lib/domain";
import { decodeBounds, decodePolygon, encodeBounds, encodePolygon, type Bounds, type LngLat } from "@/lib/geo";

export const SORTS = ["relevant", "newest", "price-asc", "price-desc", "beds", "sqft", "ppsf", "lot", "reduced", "sold-recent", "acres", "cap-rate"] as const;
export type SortKey = (typeof SORTS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  relevant: "Homes for you",
  newest: "Newest",
  "price-asc": "Price (low to high)",
  "price-desc": "Price (high to low)",
  beds: "Bedrooms",
  sqft: "Square feet",
  ppsf: "Price per sq ft",
  lot: "Lot size",
  reduced: "Recently reduced",
  "sold-recent": "Recently sold",
  acres: "Acreage",
  "cap-rate": "Cap rate",
};

const range = z
  .object({ min: z.number().nonnegative().optional(), max: z.number().nonnegative().optional() })
  .optional();

export const SearchFiltersSchema = z.object({
  mode: z.enum(SEARCH_MODES).default("buy"),
  /** Resolved place slug: city (austin-tx), neighborhood (austin-tx/travis-heights), zip (78704) or state (texas). */
  place: z.string().max(120).optional(),
  q: z.string().max(200).optional(),
  bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  polygon: z.array(z.tuple([z.number(), z.number()])).min(3).max(200).optional(),

  price: range,
  bedsMin: z.number().int().min(0).max(10).optional(),
  bathsMin: z.number().min(0).max(10).optional(),
  homeTypes: z.array(z.string().max(32)).max(16).optional(),
  sqft: range,
  lotSqft: range,
  yearBuilt: range,
  hoaMax: z.number().nonnegative().optional(),
  garageMin: z.number().int().min(0).max(10).optional(),
  singleStory: z.boolean().optional(),
  pool: z.boolean().optional(),
  waterfront: z.boolean().optional(),
  view: z.boolean().optional(),
  basement: z.boolean().optional(),
  yard: z.boolean().optional(),
  pets: z.enum(["any", "cats", "dogs"]).optional(),
  parking: z.boolean().optional(),
  keywords: z.string().max(120).optional(),
  daysOnMarketMax: z.number().int().min(1).max(3650).optional(),
  openHouse: z.boolean().optional(),
  foreclosure: z.boolean().optional(),
  fsbo: z.boolean().optional(),
  comingSoon: z.boolean().optional(),
  newConstruction: z.boolean().optional(),
  tour3d: z.boolean().optional(),
  video: z.boolean().optional(),
  priceReduced: z.boolean().optional(),
  includePending: z.boolean().optional(),
  luxury: z.boolean().optional(),
  schoolRatingMin: z.number().int().min(1).max(10).optional(),
  /** Homes zoned for / nearest to a specific school (slug). */
  school: z.string().max(140).optional(),
  soldWithinDays: z.number().int().min(1).max(3650).optional(),
  // commercial
  transaction: z.enum(["sale", "lease"]).optional(),
  capRateMin: z.number().min(0).max(30).optional(),
  // land
  acres: range,
  landTypes: z.array(z.string().max(40)).max(10).optional(),
  activities: z.array(z.string().max(40)).max(10).optional(),
  water: z.boolean().optional(),

  sort: z.enum(SORTS).default("relevant"),
  page: z.number().int().min(1).max(500).default(1),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type NumericRange = { min?: number; max?: number } | undefined;

export const PAGE_SIZE = 24;

export function defaultFilters(mode: SearchMode = "buy"): SearchFilters {
  return SearchFiltersSchema.parse({ mode });
}

// ───────────── URL ⇄ filters ─────────────

const BOOL_KEYS = {
  singleStory: "singleStory",
  pool: "pool",
  waterfront: "waterfront",
  view: "view",
  basement: "basement",
  yard: "yard",
  parking: "parking",
  openHouse: "openHouse",
  foreclosure: "foreclosure",
  fsbo: "fsbo",
  comingSoon: "comingSoon",
  newConstruction: "new",
  tour3d: "tour3d",
  video: "video",
  priceReduced: "reduced",
  includePending: "pending",
  luxury: "luxury",
  water: "water",
} as const satisfies Partial<Record<keyof SearchFilters, string>>;

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function getParam(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function num(value: string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value.replace(/[$,_\s]/g, "").replace(/k$/i, "000").replace(/m$/i, "000000"));
  return Number.isFinite(n) ? n : undefined;
}

function parseRange(value: string | undefined): NumericRange {
  if (!value) return undefined;
  const [a, b] = value.split("-");
  const min = num(a);
  const max = num(b);
  if (min == null && max == null) return undefined;
  return { ...(min != null ? { min } : {}), ...(max != null ? { max } : {}) };
}

function list(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse query params (and optional route-derived defaults) into validated filters. */
export function parseFilters(params: Params, base: Partial<SearchFilters> = {}): SearchFilters {
  const raw: Record<string, unknown> = { ...base };
  const mode = getParam(params, "mode");
  if (mode && (SEARCH_MODES as readonly string[]).includes(mode)) raw.mode = mode;
  const place = getParam(params, "place");
  if (place) raw.place = place;
  const q = getParam(params, "q");
  if (q) raw.q = q;
  const bounds = decodeBounds(getParam(params, "bounds"));
  if (bounds) raw.bounds = bounds;
  const polygon = decodePolygon(getParam(params, "poly"));
  if (polygon) raw.polygon = polygon;

  raw.price = parseRange(getParam(params, "price")) ?? raw.price;
  raw.sqft = parseRange(getParam(params, "sqft")) ?? raw.sqft;
  raw.lotSqft = parseRange(getParam(params, "lot")) ?? raw.lotSqft;
  raw.yearBuilt = parseRange(getParam(params, "year")) ?? raw.yearBuilt;
  raw.acres = parseRange(getParam(params, "acres")) ?? raw.acres;
  const assignNum = (key: keyof SearchFilters, param: string) => {
    const v = num(getParam(params, param));
    if (v != null) raw[key] = v;
  };
  assignNum("bedsMin", "beds");
  assignNum("bathsMin", "baths");
  assignNum("hoaMax", "hoa");
  assignNum("garageMin", "garage");
  assignNum("daysOnMarketMax", "dom");
  assignNum("schoolRatingMin", "schools");
  assignNum("soldWithinDays", "soldWithin");
  assignNum("capRateMin", "cap");
  assignNum("page", "page");

  const types = list(getParam(params, "type"));
  if (types) raw.homeTypes = types;
  const landTypes = list(getParam(params, "landType"));
  if (landTypes) raw.landTypes = landTypes;
  const activities = list(getParam(params, "activity"));
  if (activities) raw.activities = activities;
  const pets = getParam(params, "pets");
  if (pets === "any" || pets === "cats" || pets === "dogs") raw.pets = pets;
  const kw = getParam(params, "kw");
  if (kw) raw.keywords = kw;
  const school = getParam(params, "school");
  if (school && /^[a-z0-9-]+$/.test(school)) raw.school = school;
  const tx = getParam(params, "tx");
  if (tx === "sale" || tx === "lease") raw.transaction = tx;
  const sort = getParam(params, "sort");
  if (sort) raw.sort = sort;

  for (const [key, param] of Object.entries(BOOL_KEYS)) {
    const v = getParam(params, param);
    if (v === "1" || v === "true") raw[key] = true;
    else if (v === "0" || v === "false") raw[key] = false;
  }

  const parsed = SearchFiltersSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // Drop invalid fields one by one rather than failing the whole search.
  const cleaned: Record<string, unknown> = { ...raw };
  for (const issue of parsed.error.issues) delete cleaned[String(issue.path[0])];
  return SearchFiltersSchema.parse(cleaned);
}

function rangeParam(r: NumericRange): string | undefined {
  if (!r || (r.min == null && r.max == null)) return undefined;
  return `${r.min ?? ""}-${r.max ?? ""}`;
}

/** Serialize filters to query params (excluding what the path already encodes). */
export function filtersToQuery(f: SearchFilters, omit: Partial<Record<keyof SearchFilters, unknown>> = {}): URLSearchParams {
  const p = new URLSearchParams();
  const set = (key: string, value: string | number | undefined | null) => {
    if (value != null && value !== "") p.set(key, String(value));
  };
  if (f.q && !f.place) set("q", f.q);
  if (f.bounds) set("bounds", encodeBounds(f.bounds as Bounds));
  if (f.polygon) set("poly", encodePolygon(f.polygon as LngLat[]));
  set("price", rangeParam(f.price));
  set("beds", f.bedsMin);
  set("baths", f.bathsMin);
  if (f.homeTypes?.length && JSON.stringify(f.homeTypes) !== JSON.stringify(omit.homeTypes)) set("type", f.homeTypes.join(","));
  set("sqft", rangeParam(f.sqft));
  set("lot", rangeParam(f.lotSqft));
  set("year", rangeParam(f.yearBuilt));
  set("acres", rangeParam(f.acres));
  set("hoa", f.hoaMax);
  set("garage", f.garageMin);
  set("pets", f.pets);
  set("kw", f.keywords);
  set("dom", f.daysOnMarketMax);
  set("schools", f.schoolRatingMin);
  set("school", f.school);
  set("soldWithin", f.soldWithinDays);
  set("cap", f.capRateMin);
  if (f.transaction && f.transaction !== omit.transaction) set("tx", f.transaction);
  if (f.landTypes?.length && JSON.stringify(f.landTypes) !== JSON.stringify(omit.landTypes)) set("landType", f.landTypes.join(","));
  if (f.activities?.length && JSON.stringify(f.activities) !== JSON.stringify(omit.activities)) set("activity", f.activities.join(","));
  for (const [key, param] of Object.entries(BOOL_KEYS)) {
    const value = f[key as keyof SearchFilters];
    if (typeof value === "boolean" && value !== omit[key as keyof SearchFilters]) set(param, value ? "1" : "0");
  }
  if (f.sort && f.sort !== "relevant") set("sort", f.sort);
  if (f.page && f.page > 1) set("page", f.page);
  return p;
}

export function countActiveFilters(f: SearchFilters): number {
  const skip = new Set(["mode", "place", "q", "bounds", "polygon", "sort", "page"]);
  let count = 0;
  for (const [key, value] of Object.entries(f)) {
    if (skip.has(key) || value == null) continue;
    if (Array.isArray(value) ? value.length > 0 : typeof value === "object" ? Object.keys(value).length > 0 : value !== false) count++;
  }
  return count;
}

export function isRentMode(mode: SearchMode) {
  return mode === "rent";
}
