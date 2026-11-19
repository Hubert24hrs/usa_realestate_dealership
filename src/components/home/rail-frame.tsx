"use client";

import { useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "@/components/app-link";

/** Rail chrome: heading, "See all" and scroll buttons. Cards come in as children (server- or client-rendered). */
export function RailFrame({ id, title, subtitle, href, children }: { id: string; title: string; subtitle?: string; href?: string; children: React.ReactNode }) {
  const scroller = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });
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
        {children}
      </ul>
    </section>
  );
}
