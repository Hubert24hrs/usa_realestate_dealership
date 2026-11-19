"use client";

import { memo, useCallback, useRef, useState } from "react";
import Link from "@/components/app-link";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { ListingImage } from "@/components/media/listing-image";
import { PROPERTY_TYPE_LABELS } from "@/lib/domain";
import { attribution, daysOnMarketLabel, displayPrice, factsLine, listingBadges, listingTitle } from "@/lib/listing-format";
import type { ListingCardData } from "@/lib/search/types";
import { cn } from "@/lib/utils";
import { CARD_CLASS, RAIL_CARD_CLASS, TONES } from "./card-styles";
import { CompareCheckbox } from "./compare";
import { SaveButton } from "./save-button";


interface Props {
  listing: ListingCardData;
  priority?: boolean;
  variant?: "grid" | "rail";
  highlighted?: boolean;
  onHover?: (id: string | null) => void;
  sizes?: string;
}

function ListingCardImpl({ listing: l, priority = false, variant = "grid", highlighted = false, onHover, sizes }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [activated, setActivated] = useState(false);
  const photos = l.photos.length ? l.photos : [];
  const shown = activated ? photos : photos.slice(0, 1);
  // Grid cards carry a few photos; a final slide links to the full gallery. Rails show the cover only.
  const more = variant !== "rail" && l.photoCount > photos.length;
  const slides = photos.length + (more ? 1 : 0);
  const href = `/property/${l.slug}`;
  const title = listingTitle(l);
  const price = displayPrice(l);
  const facts = factsLine(l);
  const badges = listingBadges(l);

  const go = useCallback(
    (dir: 1 | -1) => {
      setActivated(true);
      const el = scroller.current;
      if (!el) return;
      const next = Math.min(slides - 1, Math.max(0, index + dir));
      setIndex(next);
      requestAnimationFrame(() => el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" }));
    },
    [index, slides],
  );

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (i !== index) setIndex(i);
  };

  return (
    <article
      onMouseEnter={() => {
        setActivated(true);
        onHover?.(l.id);
      }}
      onMouseLeave={() => onHover?.(null)}
      onFocusCapture={() => {
        setActivated(true);
        onHover?.(l.id);
      }}
      className={cn(
        CARD_CLASS,
        highlighted && "ring-2 ring-primary",
        variant === "rail" && RAIL_CARD_CLASS,
      )}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-muted">
        <div ref={scroller} onScroll={onScroll} className="snap-carousel h-full" aria-roledescription="carousel" aria-label={`Photos of ${title}`}>
          {shown.map((p, i) => (
            <div key={p.url} className="relative h-full w-full shrink-0 snap-start" role="group" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${l.photoCount}`}>
              <ListingImage
                src={p.url}
                alt={p.alt}
                blurDataUrl={p.blurDataUrl}
                color={p.color}
                fill
                priority={priority && i === 0}
                loading={priority && i === 0 ? undefined : "lazy"}
                sizes={sizes ?? (variant === "rail" ? "300px" : "(min-width:1536px) 20vw, (min-width:1024px) 28vw, (min-width:640px) 45vw, 92vw")}
                className="transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          ))}
          {activated && more && (
            <div className="relative grid h-full w-full shrink-0 snap-start place-items-center bg-muted" role="group" aria-roledescription="slide" aria-label="More photos">
              <Link href={href} tabIndex={-1} className="relative z-10 rounded-full bg-background px-4 py-2 text-sm font-semibold shadow">
                See all {l.photoCount} photos
              </Link>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <ul className="flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <li key={b.label} className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-semibold shadow-sm", TONES[b.tone])}>
                {b.label}
              </li>
            ))}
          </ul>
          <SaveButton listingId={l.id} label={title} className="pointer-events-auto relative z-10" />
        </div>

        {/* Arrows render once the card is hovered or focused (they follow the Save button in tab order). */}
        {activated && slides > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                go(-1);
              }}
              disabled={index === 0}
              aria-label="Previous photo"
              className="absolute top-1/2 left-2 z-10 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:hidden md:grid dark:bg-black/60 dark:text-white"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                go(1);
              }}
              disabled={index >= slides - 1}
              aria-label="Next photo"
              className="absolute top-1/2 right-2 z-10 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:hidden md:grid dark:bg-black/60 dark:text-white"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </>
        )}
        <span className="pointer-events-none absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[0.7rem] font-medium text-white tabular-nums" aria-hidden>
          <Images className="size-3" /> {Math.min(index + 1, l.photoCount)}/{l.photoCount}
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
          {l.category === "RESIDENTIAL" || (l.category === "RENTAL" && !l.isCommunity) ? (
            <span className="text-muted-foreground"> · {PROPERTY_TYPE_LABELS[l.propertyType]}</span>
          ) : null}
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
            <CompareCheckbox item={{ id: l.id, slug: l.slug, title, price, photo: photos[0] }} />
          </div>
        </div>
      </div>
    </article>
  );
}

export const ListingCard = memo(ListingCardImpl);

export function ListingCardSkeleton({ variant = "grid" }: { variant?: "grid" | "rail" }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card", variant === "rail" && "w-[78vw] shrink-0 sm:w-[300px]")} aria-hidden>
      <div className="skeleton-shimmer aspect-[3/2]" />
      <div className="space-y-2 p-4">
        <div className="skeleton-shimmer h-6 w-1/2 rounded" />
        <div className="skeleton-shimmer h-4 w-3/4 rounded" />
        <div className="skeleton-shimmer h-4 w-2/3 rounded" />
      </div>
    </div>
  );
}
