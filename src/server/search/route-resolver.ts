import "server-only";
import { cache } from "react";
import type { SearchFilters } from "@/lib/search/filters";
import { LAND_ACTIVITY_SLUGS, MODE_VERTICAL, VERTICAL_BY_SLUG, type Vertical } from "@/lib/search/verticals";
import { resolvePlace, type ResolvedPlace } from "./places";

export interface ResolvedRoute {
  kind: "search" | "place";
  vertical: Vertical;
  place: ResolvedPlace | null;
  activity: string | null;
  base: Partial<SearchFilters>;
}

/**
 * Resolves programmatic SEO paths:
 *   /homes-for-sale · /homes-for-sale/austin-tx · /homes-for-sale/austin-tx/travis-heights
 *   /apartments-for-rent/78704 · /land-for-sale/hunting/texas · /austin-tx · /texas · /78704
 */
export const resolveRoute = cache(async (segments: string[]): Promise<ResolvedRoute | null> => {
  const clean = segments.map((s) => decodeURIComponent(s).toLowerCase());
  if (!clean.length || clean.length > 4) return null;
  const vertical = VERTICAL_BY_SLUG.get(clean[0]!);
  if (vertical) {
    let rest = clean.slice(1);
    let activity: string | null = null;
    if (vertical.mode === "land" && rest[0] && LAND_ACTIVITY_SLUGS[rest[0]]) {
      activity = LAND_ACTIVITY_SLUGS[rest[0]]!;
      rest = rest.slice(1);
    }
    if (rest.length > 2) return null;
    const place = rest.length ? await resolvePlace(rest.join("/")) : null;
    if (rest.length && !place) return null;
    return {
      kind: "search",
      vertical,
      place,
      activity,
      base: { ...(vertical.preset ?? {}), mode: vertical.mode, ...(place ? { place: place.slug } : {}), ...(activity ? { activities: [activity] } : {}) },
    };
  }
  if (clean.length > 2) return null;
  const place = await resolvePlace(clean.join("/"));
  if (!place) return null;
  const v = VERTICAL_BY_SLUG.get(MODE_VERTICAL.buy)!;
  return { kind: "place", vertical: v, place, activity: null, base: { mode: "buy", place: place.slug } };
});

export function searchHeading(route: ResolvedRoute): string {
  const title = route.activity ? `${route.activity} land for sale` : route.vertical.title;
  if (!route.place) return `${title} across the USA`;
  return `${title} in ${route.place.label}`;
}
