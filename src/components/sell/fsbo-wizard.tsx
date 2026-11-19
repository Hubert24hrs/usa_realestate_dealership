"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "@/components/app-link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, Home, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import type { z } from "zod";
import { PhotoUploader, type UploadedPhoto } from "@/components/sell/photo-uploader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, apiError } from "@/lib/api-client";
import { checkFairHousing } from "@/lib/fair-housing";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BasicsSchema, DetailsSchema, FSBO_FEATURES, FSBO_PROPERTY_TYPES, ListingCopySchema, LocationSchema, RentTermsSchema } from "@/lib/validation/fsbo";

type Basics = z.output<typeof BasicsSchema>;
type Location = z.output<typeof LocationSchema>;
type Details = z.output<typeof DetailsSchema>;
type RentTerms = z.output<typeof RentTermsSchema>;
type Copy = z.output<typeof ListingCopySchema>;

export interface FsboCity {
  slug: string;
  name: string;
  stateCode: string;
  medianPpsf: number;
  medianRent: number;
}

interface Draft {
  basics?: Basics;
  location?: Location;
  details?: Details;
  rent?: RentTerms;
  photos: UploadedPhoto[];
  copy?: Copy;
}

const STEPS = ["Listing type", "Location", "Details", "Photos", "Price & description", "Review"] as const;
const DRAFT_KEY = "cv-fsbo-draft-v1";
const today = () => new Date().toISOString().slice(0, 10);
const selectCls = "h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function Field({ id, label, error, hint, className, children }: { id: string; label: React.ReactNode; error?: string; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p id={`${id}-err`} className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
const inv = (id: string, error?: unknown) => ({ id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-err` : undefined });

function Nav({ onBack, label = "Continue", busy = false, disabled = false }: { onBack?: () => void; label?: string; busy?: boolean; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
      {onBack ? <Button type="button" variant="ghost" onClick={onBack}>Back</Button> : <span />}
      <Button type="submit" disabled={busy || disabled}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {label}
      </Button>
    </div>
  );
}

// ───────────────────────── Steps ─────────────────────────

function BasicsStep({ defaults, onNext }: { defaults?: Basics; onNext: (v: Basics) => void }) {
  const form = useForm({ resolver: zodResolver(BasicsSchema), defaultValues: defaults ?? { mode: "sale" as const, propertyType: "SINGLE_FAMILY" as const } });
  const { control, register, handleSubmit } = form;
  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">What would you like to do?</legend>
        <Controller
          control={control}
          name="mode"
          render={({ field }) => (
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
              {([["sale", "Sell it myself", "For sale by owner — no listing agent", Home], ["rent", "Rent it out", "For rent by owner — find a tenant", KeyRound]] as const).map(([value, title, sub, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === value}
                  onClick={() => field.onChange(value)}
                  className={cn("flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors", field.value === value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent")}
                >
                  <Icon className="mt-0.5 size-5 text-primary" aria-hidden />
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-sm text-muted-foreground">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        />
      </fieldset>
      <Field id="fs-type" label="Property type">
        <select id="fs-type" className={selectCls} {...register("propertyType")}>
          {FSBO_PROPERTY_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Nav />
    </form>
  );
}

function LocationStep({ cities, defaults, onNext, onBack }: { cities: FsboCity[]; defaults?: Location; onNext: (v: Location) => void; onBack: () => void }) {
  const form = useForm({ resolver: zodResolver(LocationSchema), defaultValues: defaults ?? { streetAddress: "", unit: "", citySlug: "", zip: "", hideAddress: false } });
  const { control, register, handleSubmit, formState } = form;
  const e = formState.errors;
  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field id="fs-street" label="Street address" error={e.streetAddress?.message}><Input autoComplete="address-line1" placeholder="123 Main St" {...inv("fs-street", e.streetAddress)} {...register("streetAddress")} /></Field>
        <Field id="fs-unit" label="Unit (optional)" error={e.unit?.message}><Input autoComplete="address-line2" {...inv("fs-unit", e.unit)} {...register("unit")} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field id="fs-city" label="City" error={e.citySlug?.message} hint="CITI VIEW currently serves these markets.">
          <select className={selectCls} {...inv("fs-city", e.citySlug)} {...register("citySlug")}>
            <option value="">Choose a city</option>
            {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}, {c.stateCode}</option>)}
          </select>
        </Field>
        <Field id="fs-zip" label="ZIP code" error={e.zip?.message}><Input inputMode="numeric" autoComplete="postal-code" maxLength={5} {...inv("fs-zip", e.zip)} {...register("zip")} /></Field>
      </div>
      <div className="flex items-start justify-between gap-3 rounded-xl border p-3">
        <Label htmlFor="fs-hide" className="font-normal">
          <span className="block font-medium">Hide the exact address</span>
          <span className="block text-xs text-muted-foreground">Show only the street and an approximate map pin until you share it with a buyer or tenant.</span>
        </Label>
        <Controller control={control} name="hideAddress" render={({ field }) => <Switch id="fs-hide" checked={field.value} onCheckedChange={field.onChange} />} />
      </div>
      <Nav onBack={onBack} />
    </form>
  );
}

function DetailsStep({ mode, defaults, rentDefaults, onNext, onBack }: { mode: Basics["mode"]; defaults?: Details; rentDefaults?: RentTerms; onNext: (v: Details, rent?: RentTerms) => void; onBack: () => void }) {
  const form = useForm({ resolver: zodResolver(DetailsSchema), defaultValues: defaults ?? { beds: 3, baths: 2, sqft: 1600, lotSqft: undefined, yearBuilt: undefined, stories: undefined, garageSpaces: 0, hoaFee: undefined, features: [] } });
  const rentForm = useForm({ resolver: zodResolver(RentTermsSchema), defaultValues: rentDefaults ?? { availableDate: today(), leaseTermMonths: 12, securityDeposit: 0, catsAllowed: false, dogsAllowed: false, furnished: false } });
  const { control, register, handleSubmit, formState } = form;
  const e = formState.errors;
  const re = rentForm.formState.errors;
  const rent = mode === "rent";
  const submit = handleSubmit(async (details) => {
    if (!rent) return onNext(details);
    await rentForm.handleSubmit((terms) => onNext(details, terms))();
  });
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field id="fs-beds" label="Bedrooms" error={e.beds?.message}><Input type="number" min={0} {...inv("fs-beds", e.beds)} {...register("beds")} /></Field>
        <Field id="fs-baths" label="Bathrooms" error={e.baths?.message}><Input type="number" min={0} step={0.5} {...inv("fs-baths", e.baths)} {...register("baths")} /></Field>
        <Field id="fs-sqft" label="Square feet" error={e.sqft?.message}><Input type="number" min={200} {...inv("fs-sqft", e.sqft)} {...register("sqft")} /></Field>
        <Field id="fs-garage" label="Garage spaces" error={e.garageSpaces?.message}><Input type="number" min={0} {...inv("fs-garage", e.garageSpaces)} {...register("garageSpaces")} /></Field>
        <Field id="fs-lot" label="Lot size (sq ft)" error={e.lotSqft?.message}><Input type="number" min={0} {...inv("fs-lot", e.lotSqft)} {...register("lotSqft")} /></Field>
        <Field id="fs-year" label="Year built" error={e.yearBuilt?.message}><Input type="number" min={1800} {...inv("fs-year", e.yearBuilt)} {...register("yearBuilt")} /></Field>
        <Field id="fs-stories" label="Stories" error={e.stories?.message}><Input type="number" min={1} {...inv("fs-stories", e.stories)} {...register("stories")} /></Field>
        {!rent && <Field id="fs-hoa" label="HOA $/mo" error={e.hoaFee?.message}><Input type="number" min={0} {...inv("fs-hoa", e.hoaFee)} {...register("hoaFee")} /></Field>}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Features</legend>
        <Controller
          control={control}
          name="features"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {FSBO_FEATURES.map(([k, v]) => {
                const on = field.value.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => field.onChange(on ? field.value.filter((x) => x !== k) : [...field.value, k])}
                    className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm", on ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent")}
                  >
                    {on && <Check className="size-3.5" aria-hidden />}
                    {v}
                  </button>
                );
              })}
            </div>
          )}
        />
      </fieldset>
      {rent && (
        <fieldset className="space-y-4 rounded-2xl border p-4">
          <legend className="px-1 text-sm font-semibold">Rental terms</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="fs-avail" label="Available" error={re.availableDate?.message}><Input type="date" min={today()} {...inv("fs-avail", re.availableDate)} {...rentForm.register("availableDate")} /></Field>
            <Field id="fs-term" label="Lease term" error={re.leaseTermMonths?.message}>
              <select className={selectCls} {...inv("fs-term", re.leaseTermMonths)} {...rentForm.register("leaseTermMonths")}>
                {[6, 9, 12, 18, 24].map((m) => <option key={m} value={m}>{m} months</option>)}
              </select>
            </Field>
            <Field id="fs-dep" label="Security deposit ($)" error={re.securityDeposit?.message}><Input type="number" min={0} {...inv("fs-dep", re.securityDeposit)} {...rentForm.register("securityDeposit")} /></Field>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {([["catsAllowed", "Cats allowed"], ["dogsAllowed", "Dogs allowed"], ["furnished", "Furnished"]] as const).map(([name, text]) => (
              <Controller
                key={name}
                control={rentForm.control}
                name={name}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch id={`fs-${name}`} checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor={`fs-${name}`} className="font-normal">{text}</Label>
                  </div>
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Assistance animals aren&apos;t pets — they must be allowed even where pets aren&apos;t, without pet fees.</p>
        </fieldset>
      )}
      <Nav onBack={onBack} />
    </form>
  );
}

function PhotosStep({ initial, onNext, onBack }: { initial: UploadedPhoto[]; onNext: (photos: UploadedPhoto[]) => void; onBack: () => void }) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const onChange = useCallback((p: UploadedPhoto[]) => setPhotos(p), []);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!photos.length) return setError("Add at least one photo — listings with 8 or more photos get the most views.");
        if (photos.some((p) => p.alt.trim().length < 3)) return setError("Give every photo a short description.");
        onNext(photos);
      }}
      noValidate
      className="space-y-5"
    >
      <PhotoUploader initial={initial} onChange={onChange} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Nav onBack={onBack} />
    </form>
  );
}

function CopyStep({ mode, details, city, defaults, onNext, onBack }: { mode: Basics["mode"]; details?: Details; city?: FsboCity; defaults?: Copy; onNext: (v: Copy) => void; onBack: () => void }) {
  const form = useForm({ resolver: zodResolver(ListingCopySchema), defaultValues: defaults ?? { headline: "", description: "", price: 0 } });
  const { register, handleSubmit, formState, watch } = form;
  const e = formState.errors;
  const text = `${watch("headline") ?? ""}\n${watch("description") ?? ""}`;
  const findings = useMemo(() => checkFairHousing(text), [text]);
  const rent = mode === "rent";
  const guide =
    city && details
      ? rent
        ? { low: city.medianRent * 0.85, high: city.medianRent * 1.15, label: `Median rent in ${city.name} is ${formatMoney(city.medianRent)}/mo` }
        : { low: city.medianPpsf * details.sqft * 0.9, high: city.medianPpsf * details.sqft * 1.1, label: `Homes in ${city.name} list around ${formatMoney(city.medianPpsf)}/sq ft` }
      : null;
  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-5">
      <Field id="fs-price" label={rent ? "Monthly rent ($)" : "Asking price ($)"} error={e.price?.message} hint={guide ? <>{guide.label} — about {formatMoney(guide.low)}–{formatMoney(guide.high)} for your home. {!rent && <Link href="/home-value" className="font-medium text-primary hover:underline">Get a full estimate</Link>}</> : undefined}>
        <Input type="number" min={0} {...inv("fs-price", e.price)} {...register("price")} />
      </Field>
      <Field id="fs-head" label="Headline" error={e.headline?.message} hint="e.g. “Renovated craftsman with a big backyard and new roof”">
        <Input maxLength={90} {...inv("fs-head", e.headline)} {...register("headline")} />
      </Field>
      <Field id="fs-desc" label="Description" error={e.description?.message} hint="Describe the home and neighborhood features — not who should live there.">
        <Textarea rows={7} maxLength={5000} {...inv("fs-desc", e.description)} {...register("description")} />
      </Field>
      {findings.length > 0 ? (
        <div role="status" className="space-y-2 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" aria-hidden /> Fair Housing check</p>
          <ul className="space-y-1.5">
            {findings.map((f) => (
              <li key={f.phrase}>
                <span className={cn("font-medium", f.severity === "block" && "text-destructive")}>“{f.phrase}”</span> — {f.reason}
                {f.suggestion && <span className="text-muted-foreground"> {f.suggestion}</span>}
                {f.severity === "block" && <span className="ml-1 rounded bg-destructive/10 px-1.5 text-xs font-semibold text-destructive">Must fix</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        text.trim().length > 20 && <p role="status" className="flex items-center gap-2 text-sm text-success"><ShieldCheck className="size-4" aria-hidden /> No Fair Housing concerns found.</p>
      )}
      <Nav onBack={onBack} />
    </form>
  );
}

// ───────────────────────── Wizard ─────────────────────────

export function FsboWizard({ cities }: { cities: FsboCity[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({ photos: [] });
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume a draft saved in this browser.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { step: number; draft: Draft };
        setDraft({ ...saved.draft, photos: saved.draft.photos ?? [] });
        setStep(Math.min(5, Math.max(0, saved.step)));
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, draft }));
    } catch {}
  }, [draft, step, loaded]);

  const go = (s: number) => {
    setStep(s);
    setError(null);
    requestAnimationFrame(() => document.getElementById("fsbo-top")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const city = cities.find((c) => c.slug === draft.location?.citySlug);
  const mode = draft.basics?.mode ?? "sale";
  const reachable = [true, Boolean(draft.basics), Boolean(draft.location), Boolean(draft.details), draft.photos.length > 0, Boolean(draft.copy)];

  async function publish() {
    if (!draft.basics || !draft.location || !draft.details || !draft.copy || !draft.photos.length) return setError("Some steps are incomplete.");
    if (!confirm) return setError("Please confirm you're the owner or authorized to list this property.");
    setBusy(true);
    setError(null);
    const res = await api<{ slug: string }>("/api/listings/fsbo", {
      method: "POST",
      json: { ...draft.basics, ...draft.location, ...draft.details, rent: mode === "rent" ? draft.rent : undefined, ...draft.copy, photos: draft.photos, confirmOwner: true },
    });
    if (!res.ok) {
      setBusy(false);
      return setError(apiError(res, "We couldn't publish your listing."));
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    router.push(`/property/${res.data.slug}?posted=1`);
  }

  if (!loaded) return <div className="h-96 animate-pulse rounded-3xl bg-muted" aria-hidden />;

  return (
    <div id="fsbo-top" className="scroll-mt-28 space-y-6">
      <nav aria-label="Listing progress">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                disabled={!reachable[i] || busy}
                onClick={() => go(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50", i === step ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}
              >
                <span className="tabular-nums">{i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby="fsbo-step" className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 id="fsbo-step" className="mb-5 font-display text-xl font-semibold">{STEPS[step]}</h2>
        {step === 0 && <BasicsStep defaults={draft.basics} onNext={(basics) => { setDraft((d) => ({ ...d, basics })); go(1); }} />}
        {step === 1 && <LocationStep cities={cities} defaults={draft.location} onBack={() => go(0)} onNext={(location) => { setDraft((d) => ({ ...d, location })); go(2); }} />}
        {step === 2 && <DetailsStep mode={mode} defaults={draft.details} rentDefaults={draft.rent} onBack={() => go(1)} onNext={(details, rent) => { setDraft((d) => ({ ...d, details, rent })); go(3); }} />}
        {step === 3 && <PhotosStep initial={draft.photos} onBack={() => go(2)} onNext={(photos) => { setDraft((d) => ({ ...d, photos })); go(4); }} />}
        {step === 4 && <CopyStep mode={mode} details={draft.details} city={city} defaults={draft.copy} onBack={() => go(3)} onNext={(copy) => { setDraft((d) => ({ ...d, copy })); go(5); }} />}
        {step === 5 && draft.basics && draft.location && draft.details && draft.copy && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
              {draft.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element -- already-optimized upload preview
                <img src={draft.photos[0].url} alt={draft.photos[0].alt} className="aspect-[3/2] w-full rounded-2xl object-cover" />
              )}
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums">{formatMoney(draft.copy.price)}{mode === "rent" ? "/mo" : ""}</p>
                <p className="font-semibold">{draft.copy.headline}</p>
                <p className="text-sm text-muted-foreground">
                  {draft.location.streetAddress}{draft.location.unit ? ` #${draft.location.unit}` : ""}, {city ? `${city.name}, ${city.stateCode}` : ""} {draft.location.zip}
                  {draft.location.hideAddress ? " · exact address hidden" : ""}
                </p>
                <p className="mt-1 text-sm">{draft.details.beds} bd · {draft.details.baths} ba · {draft.details.sqft.toLocaleString("en-US")} sq ft · {draft.photos.length} photo{draft.photos.length === 1 ? "" : "s"}</p>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{draft.copy.description}</p>
              </div>
            </div>
            <label htmlFor="fs-confirm" className="flex items-start gap-2.5 text-sm">
              <Checkbox id="fs-confirm" checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} className="mt-0.5" />
              <span>I&apos;m the owner of this property or authorized to list it, the details and photos are accurate, and I&apos;ll follow fair housing laws when responding to inquiries.</span>
            </label>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <Button type="button" variant="ghost" onClick={() => go(4)}>Back</Button>
              <Button type="button" size="lg" onClick={publish} disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Publish listing
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
