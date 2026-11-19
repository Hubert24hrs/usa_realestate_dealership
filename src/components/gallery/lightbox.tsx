"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, ChevronLeft, ChevronRight, Film, Grid3x3, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ListingImage } from "@/components/media/listing-image";
import { MEDIA_CATEGORY_LABELS, type MediaCategoryKey } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { creditLine, embedUrl, type GalleryExtras, type GalleryItem } from "./types";

type Tab = "all" | MediaCategoryKey | "tour" | "video";

export interface LightboxProps {
  items: GalleryItem[];
  extras: GalleryExtras;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startIndex?: number;
  startTab?: Tab;
}

/** Full-screen gallery: category tabs, keyboard (←/→/Home/End/Esc), swipe, thumbnails, 3D tour + video slots. */
export default function Lightbox({ items, extras, open, onOpenChange, startIndex = 0, startTab = "all" }: LightboxProps) {
  const [tab, setTab] = useState<Tab>(startTab);
  const [index, setIndex] = useState(startIndex);
  const [showGrid, setShowGrid] = useState(false);
  const thumbs = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (open) {
      setTab(startTab);
      setIndex(startIndex);
      setShowGrid(false);
    }
  }, [open, startIndex, startTab]);

  const categories = useMemo(() => {
    const seen = new Map<MediaCategoryKey, number>();
    for (const item of items) seen.set(item.category, (seen.get(item.category) ?? 0) + 1);
    return [...seen.entries()];
  }, [items]);

  const visible = useMemo(() => (tab === "all" || tab === "tour" || tab === "video" ? items : items.filter((i) => i.category === tab)), [items, tab]);
  const current = visible[Math.min(index, visible.length - 1)];
  const isMedia = tab !== "tour" && tab !== "video";

  const go = useCallback((delta: number) => setIndex((i) => (visible.length ? (i + delta + visible.length) % visible.length : 0)), [visible.length]);

  useEffect(() => {
    if (!open || !isMedia) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Home") setIndex(0);
      else if (e.key === "End") setIndex(visible.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isMedia, go, visible.length]);

  useEffect(() => {
    thumbs.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index, tab]);

  // Preload neighbours for instant next/prev.
  useEffect(() => {
    if (!open) return;
    for (const d of [1, -1]) {
      const n = visible[(index + d + visible.length) % visible.length];
      if (n && !n.url.endsWith(".svg") && !n.url.includes(".svg?")) {
        const img = new Image();
        img.src = `/_next/image?url=${encodeURIComponent(n.url)}&w=1920&q=75`;
      }
    }
  }, [index, visible, open]);

  const tour = embedUrl(extras.tourUrl, "tour");
  const video = embedUrl(extras.videoUrl, "video");
  const credit = current ? creditLine(current) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-[#0c0e1a] p-0 text-white sm:max-w-none">
        <DialogTitle className="sr-only">{extras.title} — photo gallery</DialogTitle>
        <DialogDescription className="sr-only">Use the left and right arrow keys or swipe to browse photos. Press Escape to close.</DialogDescription>

        <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-5">
          <div role="tablist" aria-label="Photo categories" className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-none">
            <TabButton active={tab === "all"} onClick={() => { setTab("all"); setIndex(0); }}>All {items.length}</TabButton>
            {categories.map(([cat, count]) => (
              <TabButton key={cat} active={tab === cat} onClick={() => { setTab(cat); setIndex(0); setShowGrid(false); }}>
                {MEDIA_CATEGORY_LABELS[cat]} {count}
              </TabButton>
            ))}
            {extras.tourUrl && <TabButton active={tab === "tour"} onClick={() => setTab("tour")}><Box className="size-3.5" aria-hidden /> 3D tour</TabButton>}
            {extras.videoUrl && <TabButton active={tab === "video"} onClick={() => setTab("video")}><Film className="size-3.5" aria-hidden /> Video</TabButton>}
          </div>
          {isMedia && (
            <button type="button" onClick={() => setShowGrid((v) => !v)} aria-pressed={showGrid} className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 sm:inline-flex">
              <Grid3x3 className="size-4" aria-hidden /> Grid
            </button>
          )}
          <button type="button" onClick={() => onOpenChange(false)} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label="Close gallery">
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {!isMedia ? (
          <div className="grid flex-1 place-items-center p-4">
            {(tab === "tour" ? tour : video) ? (
              (tab === "tour" ? tour : video)!.type === "iframe" ? (
                <iframe title={tab === "tour" ? "3D tour" : "Video tour"} src={(tab === "tour" ? tour : video)!.src} className="aspect-video w-full max-w-6xl rounded-xl border-0" allow="xr-spatial-tracking; fullscreen; autoplay; encrypted-media" allowFullScreen loading="lazy" />
              ) : (
                <video src={video!.src} controls className="max-h-full w-full max-w-6xl rounded-xl" />
              )
            ) : (
              <div className="max-w-md rounded-2xl border border-white/15 bg-white/5 p-8 text-center">
                {tab === "tour" ? <Box className="mx-auto size-12 text-copper-300" aria-hidden /> : <Film className="mx-auto size-12 text-copper-300" aria-hidden />}
                <h3 className="mt-3 text-lg font-semibold">{tab === "tour" ? "3D tour slot" : "Video tour slot"}</h3>
                <p className="mt-2 text-sm text-white/70">
                  This demo listing reserves a {tab === "tour" ? "Matterport 3D tour" : "video"} embed. Add a {tab === "tour" ? "Matterport model URL (my.matterport.com/show/?m=…)" : "YouTube, Vimeo or MP4 URL"} in the listing editor and it plays here.
                </p>
              </div>
            )}
          </div>
        ) : showGrid ? (
          <ul className="grid flex-1 auto-rows-[minmax(0,1fr)] grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((item, i) => (
              <li key={item.id} className="relative aspect-[3/2]">
                <button type="button" onClick={() => { setIndex(i); setShowGrid(false); }} className="relative block size-full overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-copper-300" aria-label={`Open photo ${i + 1}: ${item.alt}`}>
                  <ListingImage src={item.url} alt="" blurDataUrl={item.blurDataUrl} color={item.color} fill sizes="25vw" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-3 select-none sm:px-16"
            onPointerDown={(e) => (touch.current = { x: e.clientX, y: e.clientY })}
            onPointerUp={(e) => {
              const start = touch.current;
              touch.current = null;
              if (!start) return;
              const dx = e.clientX - start.x;
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(e.clientY - start.y)) go(dx < 0 ? 1 : -1);
            }}
          >
            {current && (
              <figure className="relative h-full w-full max-w-6xl" aria-live="polite">
                <ListingImage key={current.id} src={current.url} alt={current.alt} blurDataUrl={current.blurDataUrl} color={null} fill sizes="100vw" priority className="!bg-transparent object-contain" />
              </figure>
            )}
            {visible.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute top-1/2 left-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20 sm:left-4" aria-label="Previous photo">
                  <ChevronLeft className="size-6" aria-hidden />
                </button>
                <button type="button" onClick={() => go(1)} className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20 sm:right-4" aria-label="Next photo">
                  <ChevronRight className="size-6" aria-hidden />
                </button>
              </>
            )}
          </div>
        )}

        {isMedia && current && !showGrid && (
          <footer className="border-t border-white/10 px-3 pt-2 pb-3 sm:px-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white/75">
              <p className="min-w-0">
                <span className="mr-2 font-semibold text-white tabular-nums">{index + 1} / {visible.length}</span>
                <span className="mr-2 rounded bg-white/10 px-1.5 py-0.5">{MEDIA_CATEGORY_LABELS[current.category]}</span>
                <span className="text-white/70">{current.alt}</span>
              </p>
              {credit && (
                <p className="shrink-0">
                  {credit.href ? <a href={credit.href} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{credit.text}</a> : credit.text}
                  {credit.via && <> on <a href={credit.viaHref} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{credit.via}</a></>}
                </p>
              )}
            </div>
            <div ref={thumbs} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {visible.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  data-thumb={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === index}
                  className={cn("relative h-14 w-20 shrink-0 overflow-hidden rounded-md opacity-60 transition-opacity hover:opacity-100", i === index && "opacity-100 ring-2 ring-copper-300")}
                >
                  <ListingImage src={item.url} alt="" blurDataUrl={item.blurDataUrl} color={item.color} fill sizes="80px" />
                </button>
              ))}
            </div>
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="tab" type="button" aria-selected={active} onClick={onClick} className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors", active ? "bg-white text-ink" : "text-white/80 hover:bg-white/10")}>
      {children}
    </button>
  );
}
