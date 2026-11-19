"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { z } from "zod";
import { ListingImage } from "@/components/media/listing-image";
import { ResultStat } from "@/components/tools/fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, apiError } from "@/lib/api-client";
import { formatCompactPrice, formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TCPA_TEXT } from "@/lib/validation/lead";

export interface ValueCity {
  slug: string;
  name: string;
  stateCode: string;
}

const year = new Date().getFullYear();
const FormSchema = z.object({
  address: z.string().trim().max(160),
  citySlug: z.string().min(1, "Choose a city"),
  zip: z.string().trim().regex(/^(\d{5})?$/, "Enter a 5-digit ZIP"),
  propertyType: z.enum(["SINGLE_FAMILY", "TOWNHOUSE", "CONDO", "MULTI_FAMILY", "MANUFACTURED"]),
  beds: z.coerce.number().int().min(0).max(12),
  baths: z.coerce.number().min(0).max(12),
  sqft: z.coerce.number().int().min(300, "Enter at least 300 sq ft").max(20_000),
  yearBuilt: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(1800).max(year + 1).optional()),
  garageSpaces: z.coerce.number().int().min(0).max(6),
  hasPool: z.boolean(),
  condition: z.enum(["needs-work", "average", "updated", "renovated"]),
});

interface Result {
  value: number;
  low: number;
  high: number;
  confidence: "high" | "medium" | "low";
  pricePerSqft: number;
  compsUsed: number;
  usedMarketData: boolean;
  comps: Array<{ slug: string; address: string; status: string; price: number; date: string; beds: number; baths: number; sqft: number; photo: { url: string; alt: string; blurDataUrl: string | null } | null; distanceMi: number | null; adjustedValue: number; adjustments: Array<{ label: string; amount: number }> }>;
  market: { name: string; stateCode: string; slug: string; medianPpsf: number; medianHomeValue: number; medianDom: number; listPriceYoY: number | null };
}

const selectCls = "h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";
const CONFIDENCE = { high: ["High confidence", "bg-success/15 text-success"], medium: ["Medium confidence", "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200"], low: ["Low confidence", "bg-warning/20 text-warning-foreground dark:text-warning"] } as const;
const STATUS: Record<string, string> = { SOLD: "Sold", ACTIVE: "For sale", PENDING: "Pending", COMING_SOON: "Coming soon" };

function ValuationLead({ result, address, citySlug }: { result: Result; address: string; citySlug: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  return state === "sent" ? (
    <p role="status" className="flex items-center gap-2 rounded-2xl bg-success/10 p-4 text-sm"><CheckCircle2 className="size-4 text-success" aria-hidden /> Thanks — a local listing agent will follow up with a free, in-depth valuation.</p>
  ) : (
    <form
      className="space-y-3 rounded-3xl border bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (!consent) return setError("Please agree to be contacted.");
        setState("sending");
        setError(null);
        const res = await api("/api/leads", {
          method: "POST",
          json: { type: "HOME_VALUE", name: f.get("name"), email: f.get("email"), phone: f.get("phone") ?? "", address: address || `${result.market.name}, ${result.market.stateCode}`, estimate: result.value, citySlug, message: "Requested an expert valuation from the home value tool.", consent: true, website: f.get("website") ?? "", source: "/home-value" },
        });
        if (!res.ok) {
          setState("idle");
          return setError(apiError(res));
        }
        setState("sent");
      }}
    >
      <p className="font-semibold">Want a precise number? Get a free expert valuation</p>
      <p className="text-sm text-muted-foreground">A local listing agent reviews your home&apos;s upgrades and condition in person or by video — no obligation.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5"><Label htmlFor="hv-name">Name</Label><Input id="hv-name" name="name" required minLength={2} autoComplete="name" /></div>
        <div className="space-y-1.5"><Label htmlFor="hv-email">Email</Label><Input id="hv-email" name="email" type="email" required autoComplete="email" /></div>
        <div className="space-y-1.5"><Label htmlFor="hv-phone">Phone (optional)</Label><Input id="hv-phone" name="phone" type="tel" autoComplete="tel" /></div>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label htmlFor="hv-consent" className="flex items-start gap-2.5 text-xs text-muted-foreground">
        <Checkbox id="hv-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
        <span>{TCPA_TEXT}</span>
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={state === "sending"}>{state === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden />} Request my valuation</Button>
    </form>
  );
}

export function HomeValueTool({ cities, initialCity }: { cities: ValueCity[]; initialCity: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: { address: "", citySlug: initialCity, zip: "", propertyType: "SINGLE_FAMILY" as const, beds: 3, baths: 2, sqft: 1800, yearBuilt: undefined, garageSpaces: 2, hasPool: false, condition: "average" as const },
  });
  const { register, handleSubmit, formState, watch, setValue, getValues } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const res = await api<Result>("/api/home-value", { method: "POST", json: v });
    if (!res.ok) return setError(apiError(res, "We couldn't estimate that home."));
    setResult(res.data);
    requestAnimationFrame(() => document.getElementById("hv-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  });
  const pos = result ? Math.min(100, Math.max(0, ((result.value - result.low) / Math.max(1, result.high - result.low)) * 100)) : 50;

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_8rem]">
          <div className="space-y-1.5">
            <Label htmlFor="hv-address">Street address (optional)</Label>
            <Input id="hv-address" autoComplete="street-address" placeholder="1234 Oak St" {...register("address")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hv-city">City</Label>
            <select id="hv-city" className={selectCls} aria-invalid={Boolean(e.citySlug)} {...register("citySlug")}>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}, {c.stateCode}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hv-zip">ZIP</Label>
            <Input id="hv-zip" inputMode="numeric" maxLength={5} autoComplete="postal-code" aria-invalid={Boolean(e.zip)} {...register("zip")} />
            {e.zip && <p className="text-xs text-destructive">{e.zip.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          <div className="col-span-2 space-y-1.5 sm:col-span-2">
            <Label htmlFor="hv-type">Home type</Label>
            <select id="hv-type" className={selectCls} {...register("propertyType")}>
              <option value="SINGLE_FAMILY">House</option>
              <option value="TOWNHOUSE">Townhouse</option>
              <option value="CONDO">Condo</option>
              <option value="MULTI_FAMILY">Multi-family</option>
              <option value="MANUFACTURED">Manufactured</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="hv-beds">Beds</Label><Input id="hv-beds" type="number" min={0} {...register("beds")} /></div>
          <div className="space-y-1.5"><Label htmlFor="hv-baths">Baths</Label><Input id="hv-baths" type="number" min={0} step={0.5} {...register("baths")} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="hv-sqft">Sq ft</Label>
            <Input id="hv-sqft" type="number" min={300} aria-invalid={Boolean(e.sqft)} {...register("sqft")} />
            {e.sqft && <p className="text-xs text-destructive">{e.sqft.message}</p>}
          </div>
          <div className="space-y-1.5"><Label htmlFor="hv-year">Year built</Label><Input id="hv-year" type="number" min={1800} placeholder="e.g. 1998" {...register("yearBuilt")} /></div>
          <div className="space-y-1.5"><Label htmlFor="hv-garage">Garage</Label><Input id="hv-garage" type="number" min={0} {...register("garageSpaces")} /></div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <fieldset className="min-w-0 flex-1">
            <legend className="mb-1.5 text-sm font-medium">Condition</legend>
            <div className="flex flex-wrap gap-2">
              {([["needs-work", "Needs work"], ["average", "Average"], ["updated", "Updated"], ["renovated", "Fully renovated"]] as const).map(([k, v]) => (
                <button key={k} type="button" aria-pressed={watch("condition") === k} onClick={() => setValue("condition", k)} className={cn("rounded-full border px-3 py-1.5 text-sm", watch("condition") === k ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent")}>
                  {v}
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="hv-pool" className="flex items-center gap-2 text-sm">
            <Checkbox id="hv-pool" checked={watch("hasPool")} onCheckedChange={(v) => setValue("hasPool", v === true)} /> Pool
          </label>
          <Button type="submit" size="lg" disabled={formState.isSubmitting}>
            {formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {result ? "Update estimate" : "Get my estimate"}
          </Button>
        </div>
        {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </form>

      {result && (
        <section id="hv-result" aria-labelledby="hv-result-title" className="scroll-mt-28 space-y-6">
          <div className="rounded-3xl border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="hv-result-title" className="text-sm text-muted-foreground">Estimated value</h2>
                <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatMoney(result.value)}</p>
                <p className="text-sm text-muted-foreground">{formatMoney(result.pricePerSqft)}/sq ft</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", CONFIDENCE[result.confidence][1])}>{CONFIDENCE[result.confidence][0]}</span>
            </div>
            <div className="mt-6" role="img" aria-label={`Likely range ${formatMoney(result.low)} to ${formatMoney(result.high)}, estimate ${formatMoney(result.value)}`}>
              <div className="relative h-2 rounded-full bg-gradient-to-r from-brand-200 via-brand-500 to-brand-200 dark:from-brand-900 dark:via-brand-500 dark:to-brand-900">
                <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary shadow" style={{ left: `${pos}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{formatMoney(result.low)}</span>
                <span>Likely range</span>
                <span>{formatMoney(result.high)}</span>
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {result.compsUsed
                ? `Based on ${result.compsUsed} comparable home${result.compsUsed === 1 ? "" : "s"}${result.usedMarketData ? ` and ${result.market.name} market trends` : ""}, adjusted for size, layout, age and condition.`
                : `No close comparable sales nearby — this estimate uses ${result.market.name} market trends, so treat it as a rough guide.`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ResultStat label={`Median home value · ${result.market.name}`} value={formatCompactPrice(result.market.medianHomeValue)} sub={result.market.listPriceYoY != null ? `${result.market.listPriceYoY >= 0 ? "+" : "−"}${Math.abs(result.market.listPriceYoY * 100).toFixed(1)}% list prices vs. last year` : undefined} />
            <ResultStat label="Market price per sq ft" value={formatMoney(result.market.medianPpsf)} />
            <ResultStat label="Typical days on market" value={`${result.market.medianDom} days`} />
          </div>

          {result.comps.length > 0 && (
            <div>
              <h3 className="font-display text-xl font-semibold">Comparable homes</h3>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {result.comps.map((c) => (
                  <li key={c.slug} className="flex gap-3 overflow-hidden rounded-2xl border bg-card p-3">
                    {c.photo && (
                      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl">
                        <ListingImage src={c.photo.url} alt={c.photo.alt} blurDataUrl={c.photo.blurDataUrl} fill sizes="128px" className="object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <Link href={`/property/${c.slug}`} className="block truncate font-semibold hover:underline">{c.address}</Link>
                      <p className="text-muted-foreground">{STATUS[c.status] ?? c.status} {formatDate(c.date)} · {formatMoney(c.price)}</p>
                      <p className="text-muted-foreground">{c.beds} bd · {c.baths} ba · {c.sqft.toLocaleString("en-US")} sq ft{c.distanceMi != null ? ` · ${c.distanceMi} mi` : ""}</p>
                      <details className="mt-1">
                        <summary className="cursor-pointer font-medium text-primary">Adjusted to {formatMoney(c.adjustedValue)}</summary>
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {c.adjustments.length ? c.adjustments.map((a) => <li key={a.label} className="flex justify-between gap-2"><span>{a.label}</span><span className="tabular-nums">{a.amount >= 0 ? "+" : "−"}{formatMoney(Math.abs(a.amount))}</span></li>) : <li>No adjustments needed</li>}
                        </ul>
                      </details>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <ValuationLead result={result} address={getValues("address")} citySlug={getValues("citySlug")} />
            <div className="space-y-3 rounded-3xl border bg-surface p-5">
              <p className="font-semibold">Thinking about selling?</p>
              <Button asChild className="w-full"><Link href="/sell">Compare ways to sell</Link></Button>
              <Button asChild variant="outline" className="w-full"><Link href="/sell/post">Sell it yourself (FSBO)</Link></Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
