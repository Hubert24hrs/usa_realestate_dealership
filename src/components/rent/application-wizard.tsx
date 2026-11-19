"use client";

import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, CheckCircle2, CircleAlert, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, apiError } from "@/lib/api-client";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ApplicantSchema,
  ConsentSchema,
  EMPLOYMENT_STATUS,
  EmploymentSchema,
  HomeStepSchema,
  HouseholdSchema,
  LEASE_TERMS,
  ReferencesSchema,
  type ApplicationPatch,
} from "@/lib/validation/rental";

type Applicant = NonNullable<ApplicationPatch["applicant"]>;
type Employment = NonNullable<ApplicationPatch["employment"]>;
type Household = NonNullable<ApplicationPatch["household"]>;
type Home = NonNullable<ApplicationPatch["home"]>;
type Reference = { name: string; relationship: string; contact: string };

export interface WizardUnit {
  id: string;
  unitNumber: string;
  floorPlan: string;
  beds: number;
  baths: number;
  sqft: number;
  rent: number;
  availableDate: string | null;
}

export interface WizardListing {
  id: string;
  slug: string;
  title: string;
  rent: number;
  applicationFee: number;
  defaultTerm: number;
  availableDate: string | null;
  petsNote: string;
  units: WizardUnit[];
}

export interface WizardDraft {
  id: string;
  unitId: string | null;
  moveInDate: string | null;
  leaseTermMonths: number | null;
  applicant: Partial<Applicant>;
  employment: Partial<Employment> | null;
  household: Household | null;
  references: Reference[];
}

const STEPS = ["Home", "About you", "Income", "Household", "References", "Review"] as const;
const today = () => new Date().toISOString().slice(0, 10);

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

function StepNav({ onBack, busy, label = "Save & continue" }: { onBack?: () => void; busy: boolean; label?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
      {onBack ? <Button type="button" variant="ghost" onClick={onBack}>Back</Button> : <span />}
      <Button type="submit" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {label}
      </Button>
    </div>
  );
}

// ───────────────────────── Steps ─────────────────────────

function HomeStep({ listing, defaults, onNext, busy }: { listing: WizardListing; defaults: Home; onNext: (v: Home) => void; busy: boolean }) {
  const form = useForm({ resolver: zodResolver(HomeStepSchema), defaultValues: defaults });
  const { control, register, handleSubmit, formState } = form;
  const e = formState.errors;
  return (
    <form onSubmit={handleSubmit((v) => onNext(v))} noValidate className="space-y-5">
      {listing.units.length > 0 && (
        <Field id="ap-unit" label="Unit" error={e.unitId?.message}>
          <Controller
            control={control}
            name="unitId"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v)}>
                <SelectTrigger id="ap-unit" className="w-full"><SelectValue placeholder="Choose a unit" /></SelectTrigger>
                <SelectContent>
                  {listing.units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      Unit {u.unitNumber} · {u.floorPlan} · {u.beds === 0 ? "Studio" : `${u.beds} bd`} / {u.baths} ba · {formatMoney(u.rent)}/mo
                      {u.availableDate ? ` · avail. ${formatDate(u.availableDate)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ap-move" label="Desired move in date" error={e.moveInDate?.message} hint={listing.availableDate ? `Available ${formatDate(listing.availableDate)}` : undefined}>
          <Input type="date" min={today()} {...inv("ap-move", e.moveInDate)} {...register("moveInDate")} />
        </Field>
        <Field id="ap-term" label="Lease term" error={e.leaseTermMonths?.message}>
          <Controller
            control={control}
            name="leaseTermMonths"
            render={({ field }) => (
              <Select value={String(field.value ?? "")} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger id="ap-term" className="w-full"><SelectValue placeholder="Choose a term" /></SelectTrigger>
                <SelectContent>{LEASE_TERMS.map((t) => <SelectItem key={t} value={String(t)}>{t} months</SelectItem>)}</SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
      <StepNav busy={busy} />
    </form>
  );
}

function ApplicantStep({ defaults, onNext, onBack, busy }: { defaults: Partial<Applicant>; onNext: (v: Applicant) => void; onBack: () => void; busy: boolean }) {
  const form = useForm({
    resolver: zodResolver(ApplicantSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", currentAddress: "", monthsAtAddress: 12, currentRent: 0, landlordName: "", landlordPhone: "", reasonForMoving: "", ...defaults },
  });
  const { register, handleSubmit, formState } = form;
  const e = formState.errors;
  return (
    <form onSubmit={handleSubmit((v) => onNext(v))} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ap-first" label="Legal first name" error={e.firstName?.message}><Input autoComplete="given-name" {...inv("ap-first", e.firstName)} {...register("firstName")} /></Field>
        <Field id="ap-last" label="Legal last name" error={e.lastName?.message}><Input autoComplete="family-name" {...inv("ap-last", e.lastName)} {...register("lastName")} /></Field>
        <Field id="ap-email" label="Email" error={e.email?.message}><Input type="email" autoComplete="email" {...inv("ap-email", e.email)} {...register("email")} /></Field>
        <Field id="ap-phone" label="Phone" error={e.phone?.message}><Input type="tel" autoComplete="tel" {...inv("ap-phone", e.phone)} {...register("phone")} /></Field>
      </div>
      <Field id="ap-addr" label="Current address" error={e.currentAddress?.message}><Input autoComplete="street-address" {...inv("ap-addr", e.currentAddress)} {...register("currentAddress")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ap-months" label="Months at this address" error={e.monthsAtAddress?.message}><Input type="number" min={0} inputMode="numeric" {...inv("ap-months", e.monthsAtAddress)} {...register("monthsAtAddress")} /></Field>
        <Field id="ap-rent" label="Current monthly rent ($)" error={e.currentRent?.message} hint="Enter 0 if you own or don't pay rent"><Input type="number" min={0} inputMode="numeric" {...inv("ap-rent", e.currentRent)} {...register("currentRent")} /></Field>
        <Field id="ap-ll" label="Current landlord (optional)" error={e.landlordName?.message}><Input {...inv("ap-ll", e.landlordName)} {...register("landlordName")} /></Field>
        <Field id="ap-llp" label="Landlord phone (optional)" error={e.landlordPhone?.message}><Input type="tel" {...inv("ap-llp", e.landlordPhone)} {...register("landlordPhone")} /></Field>
      </div>
      <Field id="ap-why" label="Reason for moving (optional)" error={e.reasonForMoving?.message}><Textarea rows={2} {...inv("ap-why", e.reasonForMoving)} {...register("reasonForMoving")} /></Field>
      <StepNav onBack={onBack} busy={busy} />
    </form>
  );
}

function IncomeStep({ defaults, rent, onNext, onBack, busy }: { defaults: Partial<Employment> | null; rent: number; onNext: (v: Employment) => void; onBack: () => void; busy: boolean }) {
  const form = useForm({
    resolver: zodResolver(EmploymentSchema),
    defaultValues: { status: "Employed" as const, employer: "", position: "", monthlyIncome: 0, startDate: "", otherIncome: 0, otherIncomeSource: "", ...(defaults ?? {}) },
  });
  const { control, register, handleSubmit, formState, watch } = form;
  const e = formState.errors;
  const status = watch("status");
  const income = (Number(watch("monthlyIncome")) || 0) + (Number(watch("otherIncome")) || 0);
  const ratio = rent > 0 ? income / rent : 0;
  return (
    <form onSubmit={handleSubmit((v) => onNext(v))} noValidate className="space-y-5">
      <Field id="ap-status" label="Employment status" error={e.status?.message}>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ap-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{EMPLOYMENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          )}
        />
      </Field>
      {(status === "Employed" || status === "Self employed") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ap-emp" label={status === "Employed" ? "Employer" : "Business name"} error={e.employer?.message}><Input autoComplete="organization" {...inv("ap-emp", e.employer)} {...register("employer")} /></Field>
          <Field id="ap-pos" label="Position (optional)" error={e.position?.message}><Input autoComplete="organization-title" {...inv("ap-pos", e.position)} {...register("position")} /></Field>
          <Field id="ap-start" label="Start date (optional)" error={e.startDate?.message}><Input type="date" max={today()} {...inv("ap-start", e.startDate)} {...register("startDate")} /></Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="ap-inc" label="Monthly income before tax ($)" error={e.monthlyIncome?.message}><Input type="number" min={0} inputMode="numeric" {...inv("ap-inc", e.monthlyIncome)} {...register("monthlyIncome")} /></Field>
        <Field id="ap-oth" label="Other monthly income ($)" error={e.otherIncome?.message}><Input type="number" min={0} inputMode="numeric" {...inv("ap-oth", e.otherIncome)} {...register("otherIncome")} /></Field>
        <Field id="ap-oths" label="Other income source" error={e.otherIncomeSource?.message}><Input placeholder="e.g. alimony, benefits" {...inv("ap-oths", e.otherIncomeSource)} {...register("otherIncomeSource")} /></Field>
      </div>
      {rent > 0 && income > 0 && (
        <p role="status" className={cn("flex items-start gap-2 rounded-xl p-3 text-sm", ratio >= 3 ? "bg-success/10" : ratio >= 2.5 ? "bg-warning/15" : "bg-destructive/10")}>
          {ratio >= 3 ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
          <span>
            Your income is <strong>{ratio.toFixed(1)}×</strong> the {formatMoney(rent)} rent.{" "}
            {ratio >= 3 ? "That meets the usual 3× guideline." : "Many managers look for about 3×. A cosigner or extra deposit can help."}
          </span>
        </p>
      )}
      <StepNav onBack={onBack} busy={busy} />
    </form>
  );
}

function HouseholdStep({ defaults, petsNote, onNext, onBack, busy }: { defaults: Household | null; petsNote: string; onNext: (v: Household) => void; onBack: () => void; busy: boolean }) {
  const form = useForm({ resolver: zodResolver(HouseholdSchema), defaultValues: defaults ?? { occupants: 1, hasPets: false, petDetails: "", vehicles: 0 } });
  const { control, register, handleSubmit, formState, watch } = form;
  const e = formState.errors;
  return (
    <form onSubmit={handleSubmit((v) => onNext(v))} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ap-occ" label="Total occupants (including you)" error={e.occupants?.message}><Input type="number" min={1} max={20} inputMode="numeric" {...inv("ap-occ", e.occupants)} {...register("occupants")} /></Field>
        <Field id="ap-veh" label="Vehicles" error={e.vehicles?.message}><Input type="number" min={0} max={10} inputMode="numeric" {...inv("ap-veh", e.vehicles)} {...register("vehicles")} /></Field>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
        <Label htmlFor="ap-pets" className="font-normal">Will you have pets?</Label>
        <Controller control={control} name="hasPets" render={({ field }) => <Switch id="ap-pets" checked={field.value} onCheckedChange={field.onChange} />} />
      </div>
      {watch("hasPets") && (
        <Field id="ap-petd" label="Tell us about your pets" error={e.petDetails?.message} hint={petsNote}>
          <Textarea rows={2} placeholder="e.g. one dog, Labrador mix, 55 lb, spayed" {...inv("ap-petd", e.petDetails)} {...register("petDetails")} />
        </Field>
      )}
      <p className="rounded-xl bg-surface p-3 text-xs text-muted-foreground">
        Assistance animals (service and support animals) are not pets and aren&apos;t subject to pet fees or restrictions. You can request a reasonable accommodation from the property manager at any time.
      </p>
      <StepNav onBack={onBack} busy={busy} />
    </form>
  );
}

function ReferencesStep({ defaults, onNext, onBack, busy }: { defaults: Reference[]; onNext: (v: Reference[]) => void; onBack: () => void; busy: boolean }) {
  const form = useForm({ resolver: zodResolver(ReferencesSchema), defaultValues: { references: defaults.length ? defaults : [{ name: "", relationship: "", contact: "" }] } });
  const { control, register, handleSubmit } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "references" });
  return (
    <form onSubmit={handleSubmit((v) => onNext(v.references))} noValidate className="space-y-5">
      <p className="text-sm text-muted-foreground">Optional. A past landlord or employer helps your application stand out.</p>
      {fields.map((f, i) => (
        <fieldset key={f.id} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <legend className="sr-only">Reference {i + 1}</legend>
          <Field id={`ap-ref-n-${i}`} label="Name"><Input id={`ap-ref-n-${i}`} {...register(`references.${i}.name`)} /></Field>
          <Field id={`ap-ref-r-${i}`} label="Relationship"><Input id={`ap-ref-r-${i}`} placeholder="e.g. former landlord" {...register(`references.${i}.relationship`)} /></Field>
          <Field id={`ap-ref-c-${i}`} label="Phone or email"><Input id={`ap-ref-c-${i}`} {...register(`references.${i}.contact`)} /></Field>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label={`Remove reference ${i + 1}`}><Trash2 className="size-4" aria-hidden /></Button>
        </fieldset>
      ))}
      {fields.length < 3 && (
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", relationship: "", contact: "" })}>
          <Plus className="size-4" aria-hidden /> Add a reference
        </Button>
      )}
      <StepNav onBack={onBack} busy={busy} />
    </form>
  );
}

function ReviewStep({ listing, data, unit, onEdit, onBack, onSubmit, busy }: {
  listing: WizardListing;
  data: Sections;
  unit: WizardUnit | undefined;
  onEdit: (step: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const form = useForm({ resolver: zodResolver(ConsentSchema), defaultValues: { consentScreening: false as unknown as true, certifyAccurate: false as unknown as true } });
  const { control, handleSubmit, formState } = form;
  const e = formState.errors;
  const a = data.applicant;
  const emp = data.employment;
  const h = data.household;
  const rows: Array<{ step: number; title: string; lines: string[] }> = [
    { step: 0, title: "Home", lines: [unit ? `Unit ${unit.unitNumber} · ${formatMoney(unit.rent)}/mo` : `${formatMoney(listing.rent)}/mo`, data.home?.moveInDate ? `Move in ${formatDate(data.home.moveInDate)}` : "Move in date missing", data.home?.leaseTermMonths ? `${data.home.leaseTermMonths}-month lease` : ""] },
    { step: 1, title: "About you", lines: [[a.firstName, a.lastName].filter(Boolean).join(" ") || "Name missing", a.email ?? "", a.currentAddress ?? ""] },
    { step: 2, title: "Income", lines: emp ? [`${emp.status ?? ""}${emp.employer ? ` · ${emp.employer}` : ""}`, `${formatMoney(Number(emp.monthlyIncome) || 0)}/mo${Number(emp.otherIncome) ? ` + ${formatMoney(Number(emp.otherIncome))} other` : ""}`] : ["Income missing"] },
    { step: 3, title: "Household", lines: h ? [`${h.occupants} occupant${h.occupants === 1 ? "" : "s"} · ${h.vehicles} vehicle${h.vehicles === 1 ? "" : "s"}`, h.hasPets ? `Pets: ${h.petDetails}` : "No pets"] : ["Household missing"] },
    { step: 4, title: "References", lines: data.references.filter((r) => r.name).map((r) => `${r.name} (${r.relationship || "reference"})`).concat(data.references.some((r) => r.name) ? [] : ["None added"]) },
  ];
  return (
    <form onSubmit={handleSubmit(() => onSubmit())} noValidate className="space-y-6">
      <ul className="divide-y rounded-2xl border">
        {rows.map((r) => (
          <li key={r.title} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{r.title}</p>
              {r.lines.filter(Boolean).map((l) => <p key={l} className="truncate text-sm text-muted-foreground">{l}</p>)}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(r.step)}><Pencil className="size-3.5" aria-hidden /> Edit<span className="sr-only"> {r.title}</span></Button>
          </li>
        ))}
      </ul>
      <div className="space-y-3">
        <Controller
          control={control}
          name="consentScreening"
          render={({ field }) => (
            <label htmlFor="ap-consent" className="flex items-start gap-2.5 text-sm">
              <Checkbox id="ap-consent" checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={Boolean(e.consentScreening)} aria-describedby={e.consentScreening ? "ap-consent-err" : undefined} className="mt-0.5" />
              <span>
                I authorize the property manager to verify the information I provided and obtain tenant screening reports (credit, rental history and, where permitted, background) to evaluate this application.{" "}
                <span className="text-muted-foreground">No reports are pulled here, and we never ask for your Social Security number.</span>
              </span>
            </label>
          )}
        />
        {e.consentScreening && <p id="ap-consent-err" className="text-xs text-destructive">{e.consentScreening.message}</p>}
        <Controller
          control={control}
          name="certifyAccurate"
          render={({ field }) => (
            <label htmlFor="ap-certify" className="flex items-start gap-2.5 text-sm">
              <Checkbox id="ap-certify" checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={Boolean(e.certifyAccurate)} aria-describedby={e.certifyAccurate ? "ap-certify-err" : undefined} className="mt-0.5" />
              <span>I certify the information in this application is true and complete.</span>
            </label>
          )}
        />
        {e.certifyAccurate && <p id="ap-certify-err" className="text-xs text-destructive">{e.certifyAccurate.message}</p>}
      </div>
      <div className="rounded-2xl bg-surface p-4 text-sm">
        {listing.applicationFee > 0 ? (
          <p><span className="font-semibold">Application fee: {formatMoney(listing.applicationFee)}.</span> It covers screening costs and is paid securely at the next step.</p>
        ) : (
          <p className="font-semibold">No application fee for this home.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Applications are reviewed in line with fair housing laws; decisions are never based on race, color, religion, sex, disability, familial status, national origin or other protected characteristics.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="submit" size="lg" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {listing.applicationFee > 0 ? `Continue to payment · ${formatMoney(listing.applicationFee)}` : "Submit application"}
        </Button>
      </div>
    </form>
  );
}

// ───────────────────────── Wizard ─────────────────────────

interface Sections {
  home: Home | null;
  applicant: Partial<Applicant>;
  employment: Partial<Employment> | null;
  household: Household | null;
  references: Reference[];
}

export function ApplicationWizard({ listing, draft, initialUnitId, profile, canceled }: {
  listing: WizardListing;
  draft: WizardDraft | null;
  initialUnitId: string | null;
  profile: Partial<Applicant>;
  canceled: boolean;
}) {
  const [appId, setAppId] = useState<string | null>(draft?.id ?? null);
  const [data, setData] = useState<Sections>(() => ({
    home: draft?.moveInDate && draft.leaseTermMonths ? { unitId: draft.unitId, moveInDate: draft.moveInDate, leaseTermMonths: draft.leaseTermMonths } : null,
    applicant: draft && Object.keys(draft.applicant).length ? draft.applicant : profile,
    employment: draft?.employment ?? null,
    household: draft?.household ?? null,
    references: draft?.references ?? [],
  }));
  const done = [Boolean(data.home), Boolean(data.applicant.firstName && data.applicant.currentAddress), Boolean(data.employment), Boolean(data.household), Boolean(draft?.references.length || (data.household && data.employment))];
  const [step, setStep] = useState(() => {
    const i = done.findIndex((d) => !d);
    return i === -1 ? 5 : i;
  });
  const [visited, setVisited] = useState(() => Math.max(step, done.lastIndexOf(true) + 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const unit = listing.units.find((u) => u.id === (data.home?.unitId ?? initialUnitId));
  const rent = unit?.rent ?? listing.rent;

  const go = (s: number) => {
    setStep(s);
    setVisited((v) => Math.max(v, s));
    setError(null);
    requestAnimationFrame(() => document.getElementById("wizard-top")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  async function persist(patch: ApplicationPatch, next: number) {
    setBusy(true);
    setError(null);
    try {
      let id = appId;
      if (!id) {
        const created = await api<{ id: string }>("/api/rent/applications", { method: "POST", json: { listingId: listing.id, unitId: patch.home?.unitId ?? initialUnitId } });
        if (!created.ok) throw new Error(apiError(created));
        id = created.data.id;
        setAppId(id);
        const q = new URLSearchParams(window.location.search);
        q.set("app", id);
        q.delete("canceled");
        window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
      }
      const saved = await api<{ savedAt: string }>(`/api/rent/applications/${id}`, { method: "PATCH", json: patch });
      if (!saved.ok) throw new Error(apiError(saved));
      setSavedAt(saved.data.savedAt);
      go(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!appId) return setError("Please complete the earlier steps first.");
    setBusy(true);
    setError(null);
    const res = await api<{ redirect: string }>(`/api/rent/applications/${appId}/submit`, { method: "POST", json: { consentScreening: true, certifyAccurate: true } });
    if (!res.ok) {
      setBusy(false);
      return setError(apiError(res));
    }
    window.location.assign(res.data.redirect);
  }

  return (
    <div id="wizard-top" className="scroll-mt-28 space-y-6">
      <nav aria-label="Application progress">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((label, i) => {
            const reachable = i <= visited;
            const current = i === step;
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={!reachable || busy}
                  onClick={() => go(i)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    current ? "border-primary bg-primary text-primary-foreground" : reachable ? "bg-card hover:bg-accent" : "bg-card",
                  )}
                >
                  {i < visited && !current ? <Check className="size-3.5" aria-hidden /> : <span className="tabular-nums">{i + 1}</span>}
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {canceled && !savedAt && (
        <p role="status" className="rounded-xl bg-warning/15 p-3 text-sm">Payment canceled. Your application is saved as a draft. Submit whenever you&apos;re ready.</p>
      )}

      <section aria-labelledby="step-title" className="rounded-3xl border bg-card p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="step-title" className="font-display text-xl font-semibold">{STEPS[step]}</h2>
          {savedAt && <p className="text-xs text-muted-foreground" role="status">Draft saved {new Date(savedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>}
        </div>
        {step === 0 && (
          <HomeStep
            listing={listing}
            busy={busy}
            defaults={data.home ?? { unitId: initialUnitId ?? listing.units[0]?.id ?? null, moveInDate: listing.availableDate && listing.availableDate > today() ? listing.availableDate : today(), leaseTermMonths: listing.defaultTerm }}
            onNext={(home) => {
              setData((d) => ({ ...d, home }));
              void persist({ home }, 1);
            }}
          />
        )}
        {step === 1 && (
          <ApplicantStep busy={busy} defaults={data.applicant} onBack={() => go(0)} onNext={(applicant) => {
            setData((d) => ({ ...d, applicant }));
            void persist({ applicant }, 2);
          }} />
        )}
        {step === 2 && (
          <IncomeStep busy={busy} rent={rent} defaults={data.employment} onBack={() => go(1)} onNext={(employment) => {
            setData((d) => ({ ...d, employment }));
            void persist({ employment }, 3);
          }} />
        )}
        {step === 3 && (
          <HouseholdStep busy={busy} defaults={data.household} petsNote={listing.petsNote} onBack={() => go(2)} onNext={(household) => {
            setData((d) => ({ ...d, household }));
            void persist({ household }, 4);
          }} />
        )}
        {step === 4 && (
          <ReferencesStep busy={busy} defaults={data.references} onBack={() => go(3)} onNext={(references) => {
            setData((d) => ({ ...d, references }));
            void persist({ references: { references } }, 5);
          }} />
        )}
        {step === 5 && <ReviewStep listing={listing} data={data} unit={unit} busy={busy} onEdit={go} onBack={() => go(4)} onSubmit={submit} />}
        {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </section>
    </div>
  );
}
