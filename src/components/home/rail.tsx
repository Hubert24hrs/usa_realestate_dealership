"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ListingCard, ListingCardSkeleton } from "@/components/listing/listing-card";
import type { ListingCardData } from "@/lib/search/types";

export function ListingRail({ id, title, subtitle, href, listings, loading = false }: { id: string; title: string; subtitle?: string; href?: string; listings: ListingCardData[]; loading?: boolean }) {
  const scroller = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });
  if (!loading && listings.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-title`} className="container-page py-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id={`${id}-title`} className="font-display text-[1.6rem] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {href && (
            <Link href={href} className="mr-2 hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex">
              See all <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          <button type="button" onClick={() => scroll(-1)} className="grid size-9 place-items-center rounded-full border bg-background hover:bg-accent" aria-label={`Scroll ${title} left`}>
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => scroll(1)} className="grid size-9 place-items-center rounded-full border bg-background hover:bg-accent" aria-label={`Scroll ${title} right`}>
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <ul ref={scroller} className="snap-carousel -mx-4 gap-4 px-4 pb-3 sm:mx-0 sm:px-0">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <li key={i}><ListingCardSkeleton variant="rail" /></li>)
          : listings.map((l) => (
              <li key={l.id} className="flex">
                <ListingCard listing={l} variant="rail" />
              </li>
            ))}
      </ul>
    </section>
  );
}
