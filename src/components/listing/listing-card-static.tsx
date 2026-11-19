import { Images } from "lucide-react";
import Link from "@/components/app-link";
import { ListingImage } from "@/components/media/listing-image";
import { PROPERTY_TYPE_LABELS } from "@/lib/domain";
import { attribution, daysOnMarketLabel, displayPrice, factsLine, listingBadges, listingTitle } from "@/lib/listing-format";
import type { ListingCardData } from "@/lib/search/types";
import { cn } from "@/lib/utils";
import { CARD_CLASS, RAIL_CARD_CLASS, TONES } from "./card-styles";
import { CompareCheckbox } from "./compare";
import { SaveButton } from "./save-button";

/**
 * Server-rendered rail card: same look as <ListingCard variant="rail"> (cover photo only), but only
 * the Save button, compare toggle, image and link hydrate, so a rail costs little at start-up.
 */
export function StaticRailCard({ listing: l }: { listing: ListingCardData }) {
  const href = `/property/${l.slug}`;
  const title = listingTitle(l);
  const price = displayPrice(l);
  const facts = factsLine(l);
  const cover = l.photos[0];
  return (
    <article className={cn(CARD_CLASS, RAIL_CARD_CLASS)}>
      <div className="relative aspect-[3/2] overflow-hidden bg-muted">
        {cover && (
          <ListingImage src={cover.url} alt={cover.alt} blurDataUrl={cover.blurDataUrl} color={cover.color} fill loading="lazy" sizes="300px" className="transition-transform duration-500 group-hover:scale-[1.02]" />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <ul className="flex flex-wrap gap-1.5">
            {listingBadges(l).map((b) => (
              <li key={b.label} className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-semibold shadow-sm", TONES[b.tone])}>
                {b.label}
              </li>
            ))}
          </ul>
          <SaveButton listingId={l.id} label={title} className="pointer-events-auto relative z-10" />
        </div>
        <span className="pointer-events-none absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[0.7rem] font-medium text-white tabular-nums" aria-hidden>
          <Images className="size-3" /> 1/{l.photoCount}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[1.3rem] leading-tight font-semibold tracking-tight">{price}</p>
          {l.status === "SOLD" && l.price !== l.soldPrice && <p className="text-xs text-muted-foreground">Listed {displayPrice({ ...l, status: "ACTIVE" }, true)}</p>}
        </div>
        <p className="text-sm text-foreground/85">
          {facts.map((f, i) => (
            <span key={f}>
              {i > 0 && <span className="mx-1.5 text-muted-foreground" aria-hidden>·</span>}
              {f}
            </span>
          ))}
          {l.category === "RESIDENTIAL" || (l.category === "RENTAL" && !l.isCommunity) ? <span className="text-muted-foreground"> · {PROPERTY_TYPE_LABELS[l.propertyType]}</span> : null}
        </p>
        <h3 className="truncate text-sm">
          <Link href={href} className="font-medium text-foreground outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
            {title}
          </Link>
          <span className="text-muted-foreground">, {l.city}, {l.state} {l.zip}</span>
        </h3>
        <p className="text-xs text-muted-foreground">{daysOnMarketLabel(l)}{l.moveInSpecial ? ` · ${l.moveInSpecial}` : ""}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="truncate text-[0.7rem] text-muted-foreground">{attribution(l)}</p>
          <div className="relative z-10">
            <CompareCheckbox item={{ id: l.id, slug: l.slug, title, price, photo: cover }} />
          </div>
        </div>
      </div>
    </article>
  );
}
