"use client";

import { ListingCard, ListingCardSkeleton } from "@/components/listing/listing-card";
import type { ListingCardData } from "@/lib/search/types";
import { RailFrame } from "./rail-frame";

/**
 * Client rail, for client-side data (recently viewed, personalised) and loading skeletons.
 * Server pages use <StaticListingRail>, whose cards don't need to hydrate.
 */
export function ListingRail({ id, title, subtitle, href, listings, loading = false }: { id: string; title: string; subtitle?: string; href?: string; listings: ListingCardData[]; loading?: boolean }) {
  if (!loading && listings.length === 0) return null;
  return (
    <RailFrame id={id} title={title} subtitle={subtitle} href={href}>
      {loading
        ? Array.from({ length: 4 }, (_, i) => <li key={i}><ListingCardSkeleton variant="rail" /></li>)
        : listings.map((l) => (
            <li key={l.id} className="flex">
              <ListingCard listing={l} variant="rail" />
            </li>
          ))}
    </RailFrame>
  );
}
