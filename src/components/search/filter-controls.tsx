"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LAND_ACTIVITIES, LAND_TYPES, PROPERTY_TYPE_LABELS, SEARCH_MODE_LABELS, SEARCH_MODES, type PropertyTypeKey, type SearchMode } from "@/lib/domain";
import { formatCompactPrice } from "@/lib/format";
import { countActiveFilters, filtersToQuery, SORT_LABELS, SORTS, type SearchFilters, type SortKey } from "@/lib/search/filters";
import { cn } from "@/lib/utils";

export type Patch = Partial<SearchFilters>;

const PRICE_PRESETS: Record<SearchMode, number[]> = {
  buy: [100_000, 200_000, 300_000, 400_000, 500_000, 600_000, 750_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000],
  new: [200_000, 300_000, 400_000, 500_000, 600_000, 750_000, 1_000_000, 1_500_000, 2_000_000],
  sold: [100_000, 200_000, 300_000, 400_000, 500_000, 750_000, 1_000_000, 2_000_000, 5_000_000],
  rent: [500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 4000, 5000, 7500],
  commercial: [250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000],
  land: [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000],
};

export const MODE_TYPES: Record<SearchMode, PropertyTypeKey[]> = {
  buy: ["SINGLE_FAMILY", "CONDO", "TOWNHOUSE", "MULTI_FAMILY", "MANUFACTURED"],
  new: ["SINGLE_FAMILY", "CONDO", "TOWNHOUSE"],
  sold: ["SINGLE_FAMILY", "CONDO", "TOWNHOUSE", "MULTI_FAMILY", "MANUFACTURED"],
  rent: ["APARTMENT", "SINGLE_FAMILY", "CONDO", "TOWNHOUSE"],
  commercial: ["OFFICE", "RETAIL", "INDUSTRIAL", "MIXED_USE", "MULTI_FAMILY", "HOSPITALITY"],
  land: ["LAND", "FARM_RANCH"],
};

const fmtPreset = (mode: SearchMode, n: number) => (mode === "rent" ? `$${n.toLocaleString("en-US")}` : formatCompactPrice(n));

function FilterTrigger({ active, children, ...props }: React.ComponentProps<typeof Button> & { active?: boolean }) {
  return (
    <Button variant="outline" size="lg" className={cn("h-9 shrink-0 rounded-full px-3.5", active && "border-primary bg-accent text-accent-foreground")} {...props}>
      {children}
      <ChevronDown className="size-3.5 opacity-60" aria-hidden />
    </Button>
  );
}

export function ModeSelect({ mode, onChange }: { mode: SearchMode; onChange: (m: SearchMode) => void }) {
  return (
    <Select value={mode} onValueChange={(v) => onChange(v as SearchMode)}>
      <SelectTrigger className="h-9 w-[9.5rem] shrink-0 rounded-full font-semibold" aria-label="Listing type">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SEARCH_MODES.map((m) => (
          <SelectItem key={m} value={m}>
            {m === "buy" ? "For sale" : m === "rent" ? "For rent" : SEARCH_MODE_LABELS[m]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PriceFilter({ filters, onChange }: { filters: SearchFilters; onChange: (p: Patch) => void }) {
  const presets = PRICE_PRESETS[filters.mode];
  const [min, setMin] = useState<string>(filters.price?.min?.toString() ?? "");
  const [max, setMax] = useState<string>(filters.price?.max?.toString() ?? "");
  useEffect(() => {
    setMin(filters.price?.min?.toString() ?? "");
    setMax(filters.price?.max?.toString() ?? "");
  }, [filters.price]);
  const label = filters.price?.min != null || filters.price?.max != null
    ? `${filters.price?.min != null ? fmtPreset(filters.mode, filters.price.min) : "Any"} to ${filters.price?.max != null ? fmtPreset(filters.mode, filters.price.max) : "Any"}`
    : filters.mode === "rent" ? "Rent" : "Price";
  const apply = () => {
    const a = min ? Number(min) : undefined;
    const b = max ? Number(max) : undefined;
    onChange({ price: a == null && b == null ? undefined : { ...(a != null ? { min: a } : {}), ...(b != null ? { max: b } : {}) } });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterTrigger active={filters.price != null}>{label}</FilterTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <p className="text-sm font-semibold">{filters.mode === "rent" ? "Monthly rent" : "Price range"}</p>
        <div className="grid grid-cols-2 gap-2">
          {(["min", "max"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`price-${k}`} className="text-xs text-muted-foreground">{k === "min" ? "Minimum" : "Maximum"}</Label>
              <Input id={`price-${k}`} inputMode="numeric" list={`price-presets-${filters.mode}`} placeholder={k === "min" ? "No min" : "No max"} value={k === "min" ? min : max} onChange={(e) => (k === "min" ? setMin : setMax)(e.target.value.replace(/[^\d]/g, ""))} onKeyDown={(e) => e.key === "Enter" && apply()} />
            </div>
          ))}
          <datalist id={`price-presets-${filters.mode}`}>
            {presets.map((p) => <option key={p} value={p}>{fmtPreset(filters.mode, p)}</option>)}
          </datalist>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.slice(0, 8).map((p) => (
            <button key={p} type="button" onClick={() => setMax(String(p))} className="rounded-full border px-2 py-0.5 text-xs hover:border-primary">
              ≤ {fmtPreset(filters.mode, p)}
            </button>
          ))}
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => { setMin(""); setMax(""); onChange({ price: undefined }); }}>Reset</Button>
          <Button onClick={apply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function BedsBathsFilter({ filters, onChange }: { filters: SearchFilters; onChange: (p: Patch) => void }) {
  const active = Boolean(filters.bedsMin || filters.bathsMin);
  const label = active ? `${filters.bedsMin ? `${filters.bedsMin}+ bd` : "Any bd"} · ${filters.bathsMin ? `${filters.bathsMin}+ ba` : "Any ba"}` : "Beds & baths";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterTrigger active={active}>{label}</FilterTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Bedrooms</legend>
          <ToggleGroup type="single" variant="outline" value={String(filters.bedsMin ?? 0)} onValueChange={(v) => onChange({ bedsMin: v && v !== "0" ? Number(v) : undefined })} className="w-full">
            {["0", "1", "2", "3", "4", "5"].map((b) => <ToggleGroupItem key={b} value={b} className="flex-1" aria-label={b === "0" ? "Any bedrooms" : `${b} or more bedrooms`}>{b === "0" ? "Any" : `${b}+`}</ToggleGroupItem>)}
          </ToggleGroup>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Bathrooms</legend>
          <ToggleGroup type="single" variant="outline" value={String(filters.bathsMin ?? 0)} onValueChange={(v) => onChange({ bathsMin: v && v !== "0" ? Number(v) : undefined })} className="w-full">
            {["0", "1", "1.5", "2", "3", "4"].map((b) => <ToggleGroupItem key={b} value={b} className="flex-1" aria-label={b === "0" ? "Any bathrooms" : `${b} or more bathrooms`}>{b === "0" ? "Any" : `${b}+`}</ToggleGroupItem>)}
          </ToggleGroup>
        </fieldset>
      </PopoverContent>
    </Popover>
  );
}

export function HomeTypeFilter({ filters, onChange }: { filters: SearchFilters; onChange: (p: Patch) => void }) {
  const types = MODE_TYPES[filters.mode];
  const selected = new Set(filters.homeTypes ?? []);
  const toggle = (t: string) => {
    const next = new Set(selected);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onChange({ homeTypes: next.size ? [...next] : undefined });
  };
  const label = selected.size === 0 ? (filters.mode === "commercial" ? "Property type" : "Home type") : selected.size === 1 ? PROPERTY_TYPE_LABELS[[...selected][0] as PropertyTypeKey] : `${selected.size} types`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterTrigger active={selected.size > 0}>{label}</FilterTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <fieldset className="space-y-2.5">
          <legend className="mb-1 text-sm font-semibold">{filters.mode === "commercial" ? "Property type" : "Home type"}</legend>
          {types.map((t) => (
            <div key={t} className="flex items-center gap-2.5">
              <Checkbox id={`type-${t}`} checked={selected.has(t)} onCheckedChange={() => toggle(t)} />
              <Label htmlFor={`type-${t}`} className="font-normal">{PROPERTY_TYPE_LABELS[t]}</Label>
            </div>
          ))}
        </fieldset>
      </PopoverContent>
    </Popover>
  );
}

export function SortSelect({ filters, onChange }: { filters: SearchFilters; onChange: (p: Patch) => void }) {
  const options = SORTS.filter((s) => {
    if (s === "sold-recent") return filters.mode === "sold";
    if (s === "acres") return filters.mode === "land";
    if (s === "cap-rate") return filters.mode === "commercial";
    if (s === "reduced") return filters.mode === "buy";
    return true;
  });
  return (
    <Select value={filters.sort} onValueChange={(v) => onChange({ sort: v as SortKey })}>
      <SelectTrigger className="h-9 w-48 rounded-full" aria-label="Sort results">
        <span className="text-muted-foreground">Sort:</span> <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((s) => <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-b pb-5 last:border-0">
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function ToggleRow({ id, label, checked, onChange, hint }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="flex-col items-start gap-0 font-normal">
        <span>{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function RangeInputs({ id, label, value, onChange, unit }: { id: string; label: string; value: { min?: number; max?: number } | undefined; onChange: (r: { min?: number; max?: number } | undefined) => void; unit?: string }) {
  const set = (k: "min" | "max", raw: string) => {
    const n = raw === "" ? undefined : Number(raw);
    const next = { ...(value ?? {}), [k]: n };
    if (next.min == null) delete next.min;
    if (next.max == null) delete next.max;
    onChange(Object.keys(next).length ? next : undefined);
  };
  return (
    <div className="space-y-1.5">
      <p className="text-sm">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <Input id={`${id}-min`} aria-label={`${label} minimum`} inputMode="decimal" placeholder={`Min${unit ? ` ${unit}` : ""}`} value={value?.min ?? ""} onChange={(e) => set("min", e.target.value.replace(/[^\d.]/g, ""))} />
        <Input id={`${id}-max`} aria-label={`${label} maximum`} inputMode="decimal" placeholder={`Max${unit ? ` ${unit}` : ""}`} value={value?.max ?? ""} onChange={(e) => set("max", e.target.value.replace(/[^\d.]/g, ""))} />
      </div>
    </div>
  );
}

function SelectRow({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: Array<[string, string]>; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="font-normal">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

/** Full filter panel with a live result count. */
export function MoreFiltersSheet({ filters, onApply }: { filters: SearchFilters; onApply: (f: SearchFilters) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SearchFilters>(filters);
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);
  const set = (p: Patch) => setDraft((d) => ({ ...d, ...p }));
  const mode = draft.mode;
  const query = useMemo(() => {
    const q = filtersToQuery({ ...draft, page: 1 });
    q.set("mode", draft.mode);
    if (draft.place) q.set("place", draft.place);
    q.set("points", "0");
    return q.toString();
  }, [draft]);
  const count = useQuery({
    queryKey: ["search-count", query],
    enabled: open,
    queryFn: async () => ((await (await fetch(`/api/search?${query}`)).json()) as { total: number }).total,
    staleTime: 15_000,
  });
  const active = countActiveFilters(filters) - (filters.price ? 1 : 0) - (filters.bedsMin ? 1 : 0) - (filters.bathsMin ? 1 : 0) - (filters.homeTypes?.length ? 1 : 0);
  const b = (key: keyof SearchFilters) => Boolean(draft[key]);
  const noun = mode === "rent" ? "rentals" : mode === "land" ? "properties" : mode === "commercial" ? "listings" : "homes";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="lg" className={cn("h-9 shrink-0 rounded-full px-3.5", active > 0 && "border-primary bg-accent")}>
          <SlidersHorizontal className="size-3.5" aria-hidden /> More{active > 0 ? ` (${active})` : ""}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Every filter describes the property, never the people who live nearby.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {(mode === "buy" || mode === "new") && (
            <Section title="Listing type">
              <SelectRow id="f-coming" label="Coming soon" value={draft.comingSoon === true ? "only" : draft.comingSoon === false ? "exclude" : "include"} options={[["include", "Include"], ["exclude", "Exclude"], ["only", "Only coming soon"]]} onChange={(v) => set({ comingSoon: v === "only" ? true : v === "exclude" ? false : undefined })} />
              <ToggleRow id="f-pending" label="Include pending / under contract" checked={b("includePending")} onChange={(v) => set({ includePending: v || undefined })} />
              {mode === "buy" && <ToggleRow id="f-new" label="New construction" checked={b("newConstruction")} onChange={(v) => set({ newConstruction: v || undefined })} />}
              <ToggleRow id="f-fore" label="Foreclosures" checked={b("foreclosure")} onChange={(v) => set({ foreclosure: v || undefined })} />
              <ToggleRow id="f-fsbo" label="For sale by owner" checked={b("fsbo")} onChange={(v) => set({ fsbo: v || undefined })} />
              <ToggleRow id="f-open" label="Open houses" checked={b("openHouse")} onChange={(v) => set({ openHouse: v || undefined })} />
              <ToggleRow id="f-reduced" label="Price reduced" checked={b("priceReduced")} onChange={(v) => set({ priceReduced: v || undefined })} />
            </Section>
          )}
          {mode === "sold" && (
            <Section title="Sold">
              <SelectRow id="f-sold" label="Sold within" value={String(draft.soldWithinDays ?? "any")} options={[["any", "Any time"], ["30", "30 days"], ["90", "90 days"], ["180", "6 months"], ["365", "12 months"]]} onChange={(v) => set({ soldWithinDays: v === "any" ? undefined : Number(v) })} />
            </Section>
          )}
          {mode === "commercial" && (
            <Section title="Deal">
              <SelectRow id="f-tx" label="Transaction" value={draft.transaction ?? "any"} options={[["any", "Sale or lease"], ["sale", "For sale"], ["lease", "For lease"]]} onChange={(v) => set({ transaction: v === "any" ? undefined : (v as "sale" | "lease") })} />
              <SelectRow id="f-cap" label="Min cap rate" value={String(draft.capRateMin ?? "any")} options={[["any", "Any"], ["5", "5%+"], ["6", "6%+"], ["7", "7%+"], ["8", "8%+"]]} onChange={(v) => set({ capRateMin: v === "any" ? undefined : Number(v) })} />
              <RangeInputs id="f-size" label="Size (SF)" value={draft.sqft} onChange={(r) => set({ sqft: r })} unit="SF" />
            </Section>
          )}
          {mode === "land" && (
            <Section title="Land">
              <RangeInputs id="f-acres" label="Acreage" value={draft.acres} onChange={(r) => set({ acres: r })} unit="ac" />
              <div className="space-y-2">
                <p className="text-sm">Land type</p>
                <div className="grid grid-cols-2 gap-2">
                  {LAND_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={draft.landTypes?.includes(t) ?? false} onCheckedChange={(v) => set({ landTypes: v ? [...(draft.landTypes ?? []), t] : draft.landTypes?.filter((x) => x !== t) })} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm">Activities</p>
                <div className="grid grid-cols-2 gap-2">
                  {LAND_ACTIVITIES.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={draft.activities?.includes(t) ?? false} onCheckedChange={(v) => set({ activities: v ? [...(draft.activities ?? []), t] : draft.activities?.filter((x) => x !== t) })} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <ToggleRow id="f-water" label="Water on property" hint="Creek, pond, river, spring or frontage" checked={b("water")} onChange={(v) => set({ water: v || undefined })} />
            </Section>
          )}
          {mode !== "commercial" && mode !== "land" && (
            <Section title="Home details">
              <RangeInputs id="f-sqft" label="Square feet" value={draft.sqft} onChange={(r) => set({ sqft: r })} unit="sqft" />
              <SelectRow id="f-lot" label="Lot size" value={String(draft.lotSqft?.min ?? "any")} options={[["any", "Any"], ["2000", "2,000+ sqft"], ["5000", "5,000+ sqft"], ["10890", "¼ acre+"], ["21780", "½ acre+"], ["43560", "1 acre+"], ["217800", "5 acres+"]]} onChange={(v) => set({ lotSqft: v === "any" ? undefined : { min: Number(v) } })} />
              <RangeInputs id="f-year" label="Year built" value={draft.yearBuilt} onChange={(r) => set({ yearBuilt: r })} />
              <SelectRow id="f-hoa" label="Max HOA" value={String(draft.hoaMax ?? "any")} options={[["any", "Any"], ["0", "No HOA"], ["100", "$100/mo"], ["250", "$250/mo"], ["500", "$500/mo"], ["1000", "$1,000/mo"]]} onChange={(v) => set({ hoaMax: v === "any" ? undefined : Number(v) })} />
              <SelectRow id="f-garage" label="Garage spaces" value={String(draft.garageMin ?? "any")} options={[["any", "Any"], ["1", "1+"], ["2", "2+"], ["3", "3+"]]} onChange={(v) => set({ garageMin: v === "any" ? undefined : Number(v) })} />
              <ToggleRow id="f-story" label="Single story only" checked={b("singleStory")} onChange={(v) => set({ singleStory: v || undefined })} />
              <ToggleRow id="f-base" label="Basement" checked={b("basement")} onChange={(v) => set({ basement: v || undefined })} />
            </Section>
          )}
          {mode !== "commercial" && (
            <Section title="Features">
              <ToggleRow id="f-pool" label="Pool" checked={b("pool")} onChange={(v) => set({ pool: v || undefined })} />
              <ToggleRow id="f-wf" label="Waterfront" checked={b("waterfront")} onChange={(v) => set({ waterfront: v || undefined })} />
              <ToggleRow id="f-view" label="View" checked={b("view")} onChange={(v) => set({ view: v || undefined })} />
              {mode !== "land" && <ToggleRow id="f-yard" label="Yard" checked={b("yard")} onChange={(v) => set({ yard: v || undefined })} />}
              {mode !== "land" && <ToggleRow id="f-park" label="Parking" checked={b("parking")} onChange={(v) => set({ parking: v || undefined })} />}
              {mode === "rent" && <SelectRow id="f-pets" label="Pets" value={draft.pets ?? "none"} options={[["none", "Any policy"], ["any", "Pets allowed"], ["dogs", "Dogs allowed"], ["cats", "Cats allowed"]]} onChange={(v) => set({ pets: v === "none" ? undefined : (v as "any" | "cats" | "dogs") })} />}
            </Section>
          )}
          {mode !== "commercial" && mode !== "land" && (
            <Section title="Schools">
              <SelectRow id="f-schools" label="Nearby school rating" value={String(draft.schoolRatingMin ?? "any")} options={[["any", "Any"], ["6", "6+ / 10"], ["7", "7+ / 10"], ["8", "8+ / 10"], ["9", "9+ / 10"]]} onChange={(v) => set({ schoolRatingMin: v === "any" ? undefined : Number(v) })} />
            </Section>
          )}
          <Section title="Media & timing">
            <ToggleRow id="f-3d" label="3D tour" checked={b("tour3d")} onChange={(v) => set({ tour3d: v || undefined })} />
            <ToggleRow id="f-video" label="Video tour" checked={b("video")} onChange={(v) => set({ video: v || undefined })} />
            <SelectRow id="f-dom" label="Days on market" value={String(draft.daysOnMarketMax ?? "any")} options={[["any", "Any"], ["1", "1 day"], ["7", "7 days"], ["14", "14 days"], ["30", "30 days"], ["90", "90 days"]]} onChange={(v) => set({ daysOnMarketMax: v === "any" ? undefined : Number(v) })} />
          </Section>
          <Section title="Keywords">
            <Input aria-label="Keywords" placeholder="e.g. fireplace, chef's kitchen, solar" value={draft.keywords ?? ""} onChange={(e) => set({ keywords: e.target.value || undefined })} maxLength={120} />
          </Section>
        </div>
        <SheetFooter className="flex-row gap-2 border-t px-5 py-4">
          <Button
            variant="ghost"
            onClick={() =>
              setDraft({ mode: draft.mode, place: draft.place, q: draft.q, bounds: draft.bounds, polygon: draft.polygon, sort: draft.sort, page: 1, price: draft.price, bedsMin: draft.bedsMin, bathsMin: draft.bathsMin, homeTypes: draft.homeTypes })
            }
          >
            Reset
          </Button>
          <Button className="flex-1" size="lg" onClick={() => { onApply({ ...draft, page: 1 }); setOpen(false); }}>
            {count.isFetching ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Show {count.data != null ? count.data.toLocaleString("en-US") : ""} {noun}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
