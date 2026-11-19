"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Film, Images, LayoutPanelTop } from "lucide-react";
import { ListingImage } from "@/components/media/listing-image";
import { cn } from "@/lib/utils";
import type { LightboxProps } from "./lightbox";
import type { GalleryExtras, GalleryItem } from "./types";

// Code-split: the lightbox only loads on first open.
const Lightbox = dynamic(() => import("./lightbox"), { ssr: false });

export function HeroGallery({ items, extras }: { items: GalleryItem[]; extras: GalleryExtras }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [start, setStart] = useState<{ index: number; tab: LightboxProps["startTab"] }>({ index: 0, tab: "all" });
  const photos = items.filter((i) => i.category !== "FLOOR_PLAN");
  const plans = items.filter((i) => i.category === "FLOOR_PLAN");
  const mosaic = photos.slice(0, 5);
  const [mobileIndex, setMobileIndex] = useState(0);

  const openAt = (index: number, tab: LightboxProps["startTab"] = "all") => {
    setLoaded(true);
    setStart({ index, tab });
    setOpen(true);
  };

  const pill = "inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-sm font-semibold text-ink shadow-[var(--shadow-raised)] transition-colors hover:bg-white dark:bg-black/70 dark:text-white";

  return (
    <section aria-label="Photo gallery" className="relative">
      {/* Mobile: swipeable carousel */}
      <div className="relative md:hidden">
        <div
          className="snap-carousel aspect-[4/3]"
          onScroll={(e) => setMobileIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          aria-roledescription="carousel"
        >
          {photos.map((item, i) => (
            <button key={item.id} type="button" onClick={() => openAt(i)} className="relative h-full w-full shrink-0 snap-start" aria-label={`Open photo ${i + 1} of ${items.length}: ${item.alt}`}>
              <ListingImage src={item.url} alt={item.alt} blurDataUrl={item.blurDataUrl} color={item.color} fill sizes="100vw" priority={i === 0} loading={i === 0 ? undefined : "lazy"} />
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
          {mobileIndex + 1} / {items.length}
        </span>
      </div>

      {/* Desktop: hero mosaic */}
      <div className="hidden h-[min(62vh,560px)] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl md:grid">
        {mosaic.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openAt(i)}
            className={cn("group relative overflow-hidden bg-muted focus-visible:z-10", i === 0 ? "col-span-2 row-span-2" : "", mosaic.length < 5 && i === 0 ? "col-span-4" : "")}
            aria-label={`Open photo ${i + 1} of ${items.length}: ${item.alt}`}
          >
            <ListingImage
              src={item.url}
              alt={item.alt}
              blurDataUrl={item.blurDataUrl}
              color={item.color}
              fill
              priority={i === 0}
              sizes={i === 0 ? "(min-width:1320px) 660px, 50vw" : "(min-width:1320px) 330px, 25vw"}
              className="transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute right-3 bottom-3 hidden flex-wrap justify-end gap-2 md:flex">
        {extras.tourUrl && (
          <button type="button" onClick={() => openAt(0, "tour")} className={cn(pill, "pointer-events-auto")}>
            <Box className="size-4" aria-hidden /> 3D tour
          </button>
        )}
        {extras.videoUrl && (
          <button type="button" onClick={() => openAt(0, "video")} className={cn(pill, "pointer-events-auto")}>
            <Film className="size-4" aria-hidden /> Video
          </button>
        )}
        {plans.length > 0 && (
          <button type="button" onClick={() => openAt(0, plans[0]!.category)} className={cn(pill, "pointer-events-auto")}>
            <LayoutPanelTop className="size-4" aria-hidden /> Floor plan
          </button>
        )}
        <button type="button" onClick={() => openAt(0)} className={cn(pill, "pointer-events-auto")}>
          <Images className="size-4" aria-hidden /> View all {items.length} photos
        </button>
      </div>

      {loaded && <Lightbox items={items} extras={extras} open={open} onOpenChange={setOpen} startIndex={start.index} startTab={start.tab} />}
    </section>
  );
}
