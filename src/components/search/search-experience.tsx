"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Columns2, List, Map as MapIcon, SearchX, X } from "lucide-react";
import { ListingCard, ListingCardSkeleton } from "@/components/listing/listing-card";
import { CompareProvider } from "@/components/listing/compare";
import { SearchMap } from "@/components/map/search-map";
import { Button } from "@/components/ui/button";
import type { SearchMode } from "@/lib/domain";
import type { Bounds, LngLat } from "@/lib/geo";
import { describeFilters } from "@/lib/search/describe";
import { filtersToQuery, type SearchFilters } from "@/lib/search/filters";
import type { SearchResult, Suggestion } from "@/lib/search/types";
import { MODE_VERTICAL, buildSearchHref } from "@/lib/search/verticals";
import { cn } from "@/lib/utils";
import { BedsBathsFilter, HomeTypeFilter, ModeSelect, MoreFiltersSheet, PriceFilter, SortSelect, type Patch } from "./filter-controls";
import { LocationSearch } from "./location-search";
import { Pagination } from "./pagination";
import { SaveSearchButton } from "./save-search-button";

type View = "split" | "list" | "map";

export interface SearchExperienceProps {
  vertical: string;
  initialFilters: SearchFilters;
  initialResult: SearchResult;
  heading: string;
  placeLabel: string | null;
  placeBoundary: LngLat[] | null;
  children?: React.ReactNode;
}

const NOUN: Record<SearchMode, [string, string]> = {
  buy: ["home", "homes"],
  new: ["new home", "new homes"],
  sold: ["sold home", "sold homes"],
  rent: ["rental", "rentals"],
  commercial: ["listing", "listings"],
  land: ["property", "properties"],
};

function apiQuery(f: SearchFilters): string {
  const q = filtersToQuery(f);
  q.set("mode", f.mode);
  if (f.place) q.set("place", f.place);
  return q.toString();
}

export function SearchExperience({ vertical, initialFilters, initialResult, heading, placeLabel, placeBoundary, children }: SearchExperienceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [view, setView] = useState<View>("split");
  const [mobileMap, setMobileMap] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [searchAsMove, setSearchAsMove] = useState(Boolean(initialFilters.bounds));
  const [mapPct, setMapPct] = useState(52);
  const listTop = useRef<HTMLDivElement>(null);
  const firstKey = useRef(apiQuery(initialFilters));

  useEffect(() => {
    try {
      const v = localStorage.getItem("cv_search_view") as View | null;
      if (v === "split" || v === "list" || v === "map") setView(v);
      const pct = Number(localStorage.getItem("cv_search_map_pct"));
      if (pct >= 30 && pct <= 70) setMapPct(pct);
    } catch {}
  }, []);
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem("cv_search_view", v);
    } catch {}
  };

  const key = useMemo(() => apiQuery(filters), [filters]);
  const { data, isFetching, isError } = useQuery({
    queryKey: ["search", key],
    queryFn: async () => {
      const res = await fetch(`/api/search?${key}`);
      if (!res.ok) throw new Error("search failed");
      return (await res.json()) as SearchResult;
    },
    initialData: key === firstKey.current ? initialResult : undefined,
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
  const result = data ?? initialResult;

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const update = useCallback(
    (patch: Patch, opts: { keepPage?: boolean } = {}) => {
      const current = filtersRef.current;
      const next: SearchFilters = { ...current, ...patch, page: opts.keepPage ? (patch.page ?? current.page) : 1 };
      for (const k of Object.keys(next) as Array<keyof SearchFilters>) if (next[k] === undefined) delete next[k];
      const href = buildSearchHref(next, next.mode === current.mode ? vertical : MODE_VERTICAL[next.mode]);
      const nextPath = href.split("?")[0];
      filtersRef.current = next;
      setFilters(next);
      // Same page (filters only): update the URL without a server round-trip; data comes from /api/search.
      // New place or listing type: navigate so the server renders the new SEO page.
      if (nextPath === window.location.pathname) window.history.replaceState(window.history.state, "", href);
      else router.push(href, { scroll: false });
    },
    [router, vertical],
  );

  const onBoundsChange = useCallback((bounds: Bounds) => update({ bounds, polygon: undefined }), [update]);
  const onPolygonChange = useCallback((ring: LngLat[] | null) => update({ polygon: ring ?? undefined, bounds: undefined }), [update]);
  const onLocation = (s: Suggestion) => {
    if (s.href) return router.push(s.href);
    update({ place: s.place, q: undefined, bounds: undefined, polygon: undefined });
  };
  const onMode = (mode: SearchMode) =>
    update({ mode, homeTypes: undefined, price: undefined, transaction: undefined, capRateMin: undefined, landTypes: undefined, activities: undefined, acres: undefined, soldWithinDays: undefined, pets: undefined, sort: "relevant" });

  const chips = describeFilters(filters);
  const [singular, plural] = NOUN[filters.mode];
  const count = result.total;
  const href = buildSearchHref(filters, vertical);
  const fitKey = `${filters.mode}|${filters.place ?? ""}|${filters.q ?? ""}|${pathname}`;
  const firstIndex = (result.page - 1) * result.pageSize + 1;
  const lastIndex = Math.min(result.total, result.page * result.pageSize);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const container = (e.currentTarget as HTMLElement).parentElement!;
    const rect = container.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const pct = Math.min(70, Math.max(30, ((ev.clientX - rect.left) / rect.width) * 100));
      setMapPct(pct);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setMapPct((p) => {
        try {
          localStorage.setItem("cv_search_map_pct", String(Math.round(p)));
        } catch {}
        return p;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const map = (
    <SearchMap
      points={result.points}
      bbox={result.bbox}
      fitKey={fitKey}
      placeBoundary={filters.bounds || filters.polygon ? null : placeBoundary}
      polygon={filters.polygon ?? null}
      hoveredId={hovered}
      onHoverPoint={setHovered}
      searchAsMove={searchAsMove}
      onSearchAsMoveChange={(v) => {
        setSearchAsMove(v);
        if (!v && filters.bounds) update({ bounds: undefined });
      }}
      onBoundsChange={onBoundsChange}
      onPolygonChange={onPolygonChange}
      loading={isFetching}
    />
  );

  return (
    <CompareProvider>
      {/* Filter bar */}
      <div className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex h-[3.75rem] items-center gap-2 overflow-x-auto px-4 scrollbar-none lg:px-6">
          <LocationSearch key={placeLabel ?? "none"} defaultValue={placeLabel ?? filters.q ?? ""} placeholder="City, neighborhood, ZIP, address" className="w-56 shrink-0 lg:w-72" onSelect={onLocation} onSubmitText={(text, first) => (first ? onLocation(first) : update({ q: text, place: undefined }))} />
          <ModeSelect mode={filters.mode} onChange={onMode} />
          <PriceFilter filters={filters} onChange={update} />
          {filters.mode !== "commercial" && filters.mode !== "land" && <BedsBathsFilter filters={filters} onChange={update} />}
          <HomeTypeFilter filters={filters} onChange={update} />
          <MoreFiltersSheet filters={filters} onApply={(f) => update(f)} />
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
            <SaveSearchButton filters={filters} href={href} defaultName={heading} />
            <div role="group" aria-label="Layout" className="hidden items-center rounded-full border p-0.5 md:flex">
              {([["list", List, "List only"], ["split", Columns2, "Map and list"], ["map", MapIcon, "Map only"]] as const).map(([v, Icon, label]) => (
                <button key={v} type="button" onClick={() => changeView(v)} aria-pressed={view === v} aria-label={label} className={cn("grid size-8 place-items-center rounded-full text-muted-foreground transition-colors", view === v && "bg-primary text-primary-foreground")}>
                  <Icon className="size-4" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {view !== "list" && (
          <aside className="sticky top-[7.75rem] hidden h-[calc(100dvh-7.75rem)] shrink-0 md:block" style={{ width: view === "map" ? "100%" : `${mapPct}%` }}>
            {map}
          </aside>
        )}
        {view === "split" && (
          <div role="separator" aria-orientation="vertical" aria-label="Resize map" tabIndex={0} onPointerDown={startResize} onKeyDown={(e) => { if (e.key === "ArrowLeft") setMapPct((p) => Math.max(30, p - 3)); if (e.key === "ArrowRight") setMapPct((p) => Math.min(70, p + 3)); }} className="sticky top-[7.75rem] hidden h-[calc(100dvh-7.75rem)] w-1.5 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary/40 focus-visible:bg-primary/60 md:block" />
        )}
        <section aria-labelledby="results-heading" className={cn("min-w-0 flex-1 px-4 pt-5 pb-10 lg:px-6", view === "map" && "md:hidden")}>
            <div ref={listTop} className="scroll-mt-32" />
            <header className="mb-4 space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 id="results-heading" className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{heading}</h1>
                  <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                    {isFetching ? "Updating…" : count === 0 ? `No ${plural}` : `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}${result.pageCount > 1 ? ` · showing ${firstIndex}–${lastIndex}` : ""}`}
                  </p>
                </div>
                <SortSelect filters={filters} onChange={update} />
              </div>
              {chips.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Active filters">
                  {chips.map((c) => (
                    <li key={c.label}>
                      <button
                        type="button"
                        onClick={() => update(Object.fromEntries(c.keys.map((k) => [k, undefined])) as Patch)}
                        className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 hover:border-brand-400 dark:text-brand-900"
                        aria-label={`Remove filter: ${c.label}`}
                      >
                        {c.label} <X className="size-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                  <li>
                    <button type="button" onClick={() => setFilters((f) => { const next: SearchFilters = { mode: f.mode, place: f.place, sort: f.sort, page: 1 }; window.history.replaceState(window.history.state, "", buildSearchHref(next, vertical)); return next; })} className="px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
                      Clear all
                    </button>
                  </li>
                </ul>
              )}
            </header>

            {isError && <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">We couldn&apos;t refresh results. Showing the last results we loaded.</p>}

            {count === 0 && !isFetching ? (
              <div className="grid place-items-center rounded-2xl border border-dashed px-6 py-16 text-center">
                <SearchX className="size-10 text-muted-foreground" aria-hidden />
                <h2 className="mt-3 text-lg font-semibold">No {plural} match these filters</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Try removing a filter, widening your price range, or zooming the map out.</p>
                <Button className="mt-4" variant="outline" onClick={() => update({ price: undefined, bedsMin: undefined, bathsMin: undefined, homeTypes: undefined, bounds: undefined, polygon: undefined })}>
                  Reset main filters
                </Button>
              </div>
            ) : (
              <motion.ul layout className={cn("grid gap-5", view === "list" ? "sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3")}>
                {isFetching && !data
                  ? Array.from({ length: 6 }, (_, i) => <li key={i}><ListingCardSkeleton /></li>)
                  : result.results.map((l, i) => (
                      <li key={l.id}>
                        <ListingCard listing={l} priority={i < 2} highlighted={hovered === l.id} onHover={setHovered} />
                      </li>
                    ))}
              </motion.ul>
            )}

            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              hrefFor={(p) => buildSearchHref({ ...filters, page: p }, vertical)}
              onPage={(p) => {
                update({ page: p }, { keepPage: true });
                listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
            {children}
          </section>
      </div>

      {/* Mobile: floating map toggle + full-screen map with results sheet */}
      <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 md:hidden">
        <Button size="lg" className="h-11 rounded-full px-5 shadow-[var(--shadow-float)]" onClick={() => setMobileMap((v) => !v)}>
          {mobileMap ? <List className="size-4" aria-hidden /> : <MapIcon className="size-4" aria-hidden />} {mobileMap ? "List" : "Map"}
        </Button>
      </div>
      {mobileMap && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-20 md:hidden">
          {map}
          <MobileResultsSheet result={result} plural={plural} onHover={setHovered} />
        </div>
      )}
    </CompareProvider>
  );
}

function MobileResultsSheet({ result, plural, onHover }: { result: SearchResult; plural: string; onHover: (id: string | null) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={cn("absolute inset-x-0 bottom-0 z-10 rounded-t-3xl border-t bg-background shadow-[var(--shadow-float)] transition-[height] duration-300", expanded ? "h-[62%]" : "h-[11.5rem]")}>
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full flex-col items-center gap-1 pt-2.5 pb-2" aria-expanded={expanded} aria-label={expanded ? "Collapse results" : "Expand results"}>
        <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <span className="text-sm font-semibold">{result.total.toLocaleString("en-US")} {plural}</span>
      </button>
      <ul className={cn("gap-3 px-4 pb-20", expanded ? "grid h-[calc(100%-3.5rem)] overflow-y-auto" : "snap-carousel")}>
        {result.results.map((l) => (
          <li key={l.id} className={expanded ? "" : "w-[78vw] shrink-0 snap-center"}>
            <ListingCard listing={l} onHover={onHover} variant={expanded ? "grid" : "rail"} />
          </li>
        ))}
      </ul>
    </div>
  );
}
