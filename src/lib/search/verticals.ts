import type { SearchMode } from "@/lib/domain";
import { filtersToQuery, type SearchFilters } from "./filters";

export interface Vertical {
  slug: string;
  mode: SearchMode;
  /** e.g. "Homes for sale" — combined with the place label for H1/title. */
  title: string;
  preset?: Partial<SearchFilters>;
}

export const VERTICALS: Vertical[] = [
  { slug: "homes-for-sale", mode: "buy", title: "Homes for sale" },
  { slug: "houses-for-sale", mode: "buy", title: "Houses for sale", preset: { homeTypes: ["SINGLE_FAMILY"] } },
  { slug: "condos-for-sale", mode: "buy", title: "Condos for sale", preset: { homeTypes: ["CONDO"] } },
  { slug: "townhomes-for-sale", mode: "buy", title: "Townhomes for sale", preset: { homeTypes: ["TOWNHOUSE"] } },
  { slug: "multi-family-homes-for-sale", mode: "buy", title: "Multi-family homes for sale", preset: { homeTypes: ["MULTI_FAMILY"] } },
  { slug: "luxury-homes", mode: "buy", title: "Luxury homes for sale", preset: { luxury: true } },
  { slug: "open-houses", mode: "buy", title: "Open houses", preset: { openHouse: true } },
  { slug: "price-reduced-homes", mode: "buy", title: "Price-reduced homes", preset: { priceReduced: true } },
  { slug: "foreclosures", mode: "buy", title: "Foreclosures", preset: { foreclosure: true } },
  { slug: "for-sale-by-owner", mode: "buy", title: "For sale by owner homes", preset: { fsbo: true } },
  { slug: "new-construction", mode: "new", title: "New construction homes" },
  { slug: "sold-homes", mode: "sold", title: "Recently sold homes" },
  { slug: "apartments-for-rent", mode: "rent", title: "Apartments for rent" },
  { slug: "houses-for-rent", mode: "rent", title: "Houses for rent", preset: { homeTypes: ["SINGLE_FAMILY", "TOWNHOUSE"] } },
  { slug: "condos-for-rent", mode: "rent", title: "Condos for rent", preset: { homeTypes: ["CONDO"] } },
  { slug: "pet-friendly-rentals", mode: "rent", title: "Pet-friendly rentals", preset: { pets: "any" } },
  { slug: "commercial-real-estate", mode: "commercial", title: "Commercial real estate" },
  { slug: "office-space-for-lease", mode: "commercial", title: "Office space for lease", preset: { homeTypes: ["OFFICE"], transaction: "lease" } },
  { slug: "retail-space", mode: "commercial", title: "Retail space", preset: { homeTypes: ["RETAIL"] } },
  { slug: "industrial-space", mode: "commercial", title: "Industrial & warehouse space", preset: { homeTypes: ["INDUSTRIAL"] } },
  { slug: "investment-properties", mode: "commercial", title: "Investment properties for sale", preset: { transaction: "sale" } },
  { slug: "land-for-sale", mode: "land", title: "Land for sale" },
  { slug: "ranches-for-sale", mode: "land", title: "Ranches for sale", preset: { landTypes: ["Ranch"] } },
  { slug: "farms-for-sale", mode: "land", title: "Farms for sale", preset: { landTypes: ["Farm"] } },
  { slug: "timberland-for-sale", mode: "land", title: "Timberland for sale", preset: { landTypes: ["Timberland"] } },
  { slug: "recreational-land-for-sale", mode: "land", title: "Recreational land for sale", preset: { landTypes: ["Recreational"] } },
  { slug: "waterfront-land-for-sale", mode: "land", title: "Waterfront land for sale", preset: { water: true } },
  { slug: "residential-lots-for-sale", mode: "land", title: "Residential lots for sale", preset: { landTypes: ["Residential lot"] } },
];

export const VERTICAL_BY_SLUG = new Map(VERTICALS.map((v) => [v.slug, v]));

export const MODE_VERTICAL: Record<SearchMode, string> = {
  buy: "homes-for-sale",
  rent: "apartments-for-rent",
  new: "new-construction",
  sold: "sold-homes",
  commercial: "commercial-real-estate",
  land: "land-for-sale",
};

/** /land-for-sale/{activity}/{place} — "by activity" land pages. */
export const LAND_ACTIVITY_SLUGS: Record<string, string> = {
  hunting: "Hunting",
  fishing: "Fishing",
  camping: "Camping",
  hiking: "Hiking",
  "horseback-riding": "Horseback riding",
  "off-roading": "Off-roading",
  boating: "Boating",
  "bird-watching": "Bird watching",
  stargazing: "Stargazing",
};

export function activitySlug(activity: string): string | undefined {
  return Object.entries(LAND_ACTIVITY_SLUGS).find(([, label]) => label === activity)?.[0];
}

/** Turn filters into the canonical SEO path + query string. */
export function buildSearchHref(filters: SearchFilters, verticalSlug?: string): string {
  let vertical = verticalSlug ? VERTICAL_BY_SLUG.get(verticalSlug) : undefined;
  if (!vertical || vertical.mode !== filters.mode) vertical = VERTICAL_BY_SLUG.get(MODE_VERTICAL[filters.mode])!;
  const segments = [vertical.slug];
  const omit: Partial<SearchFilters> = { ...(vertical.preset ?? {}) };
  if (vertical.mode === "land" && filters.activities?.length === 1 && !vertical.preset) {
    const slug = activitySlug(filters.activities[0]!);
    if (slug) {
      segments.push(slug);
      omit.activities = filters.activities;
    }
  }
  if (filters.place) segments.push(...filters.place.split("/"));
  const query = filtersToQuery(filters, omit).toString();
  return `/${segments.join("/")}${query ? `?${query}` : ""}`;
}
