import { StaticRailCard } from "@/components/listing/listing-card-static";
import type { ListingCardData } from "@/lib/search/types";
import { RailFrame } from "./rail-frame";

/** Listing rail for server-rendered pages: cards render on the server; only small islands hydrate. */
export function StaticListingRail({ id, title, subtitle, href, listings }: { id: string; title: string; subtitle?: string; href?: string; listings: ListingCardData[] }) {
  if (listings.length === 0) return null;
  return (
    <RailFrame id={id} title={title} subtitle={subtitle} href={href}>
      {listings.map((l) => (
        <li key={l.id} className="flex">
          <StaticRailCard listing={l} />
        </li>
      ))}
    </RailFrame>
  );
}
