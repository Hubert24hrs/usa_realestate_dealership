"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS } from "@/lib/domain";
import { checkFairHousing } from "@/lib/fair-housing";
import { FLAG_FIELDS, LISTING_STATUSES } from "@/lib/validation/admin";
import { selectCls, useMutate } from "./controls";

type Flag = (typeof FLAG_FIELDS)[number];
const FLAG_LABEL: Record<Flag, string> = {
  isFeatured: "Featured (paid placement, shown with a “Featured” label)",
  isLuxury: "Luxury",
  isNewConstruction: "New construction",
  hideAddress: "Hide street address",
  hasPool: "Pool",
  isWaterfront: "Waterfront",
  hasView: "View",
  petsAllowed: "Pets allowed",
  has3dTour: "3D tour",
  hasVideo: "Video tour",
};

export interface EditableListing {
  id: string;
  status: string;
  headline: string;
  description: string;
  price: number;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSqft: number | null;
  yearBuilt: number | null;
  hoaFee: number | null;
  agentId: string | null;
  flags: Record<Flag, boolean>;
  rental: boolean;
}

const NUMS = [
  ["beds", "Beds"],
  ["baths", "Baths"],
  ["sqft", "Interior sq ft"],
  ["lotSqft", "Lot sq ft"],
  ["yearBuilt", "Year built"],
  ["hoaFee", "HOA $/mo"],
] as const;

export function ListingEditor({ listing, agents }: { listing: EditableListing; agents: Array<{ id: string; name: string }> }) {
  const { busy, run } = useMutate();
  const [form, setForm] = useState(() => ({
    headline: listing.headline,
    description: listing.description,
    price: String(listing.price),
    status: listing.status,
    agentId: listing.agentId ?? "",
    ...Object.fromEntries(NUMS.map(([k]) => [k, listing[k] == null ? "" : String(listing[k])])),
  }) as Record<string, string>);
  const [flags, setFlags] = useState(listing.flags);
  const findings = useMemo(() => checkFairHousing(`${form.headline}\n${form.description}`), [form.headline, form.description]);
  const blocked = findings.some((f) => f.severity === "block");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.price.replace(/[^\d]/g, ""));
    await run(
      `/api/admin/listings/${listing.id}`,
      "PATCH",
      {
        headline: form.headline.trim() || null,
        description: form.description,
        price,
        status: form.status,
        agentId: form.agentId || null,
        ...Object.fromEntries(NUMS.map(([k]) => [k, form[k] === "" ? null : form[k]])),
        flags,
      },
      form.status !== listing.status && listing.status === "DRAFT" ? "Published" : "Saved",
    );
  };

  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-[1fr_200px_200px]">
        <div>
          <label htmlFor="ed-headline" className="mb-1.5 block text-sm font-medium">Headline</label>
          <Input id="ed-headline" value={form.headline} onChange={set("headline")} maxLength={120} placeholder="Optional. Example: Corner lot with a renovated kitchen" />
        </div>
        <div>
          <label htmlFor="ed-price" className="mb-1.5 block text-sm font-medium">{listing.rental ? "Rent ($/mo)" : "Price ($)"}</label>
          <Input id="ed-price" inputMode="numeric" value={form.price} onChange={set("price")} required />
        </div>
        <div>
          <label htmlFor="ed-status" className="mb-1.5 block text-sm font-medium">Status</label>
          <select id="ed-status" value={form.status} onChange={set("status")} className={`${selectCls} h-9 w-full`}>
            {LISTING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="ed-description" className="mb-1.5 block text-sm font-medium">Description</label>
        <Textarea id="ed-description" rows={8} value={form.description} onChange={set("description")} maxLength={10_000} aria-describedby={findings.length ? "ed-fh" : undefined} />
        {findings.length > 0 && (
          <div id="ed-fh" role="status" className="mt-2 space-y-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            {findings.map((f, i) => (
              <p key={i} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                <span><strong>“{f.phrase}”</strong>: {f.reason}{f.suggestion ? ` ${f.suggestion}` : ""}{f.severity === "block" ? " (must be fixed to save)" : ""}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Facts</legend>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {NUMS.map(([k, label]) => (
            <div key={k}>
              <label htmlFor={`ed-${k}`} className="mb-1 block text-xs text-muted-foreground">{label}</label>
              <Input id={`ed-${k}`} inputMode="decimal" value={form[k]} onChange={set(k)} />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <label htmlFor="ed-agent" className="mb-1.5 block text-sm font-medium">Listing agent</label>
          <select id="ed-agent" value={form.agentId} onChange={set("agentId")} className={`${selectCls} h-9 w-full`}>
            <option value="">No agent (owner or staff)</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Flags</legend>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {FLAG_FIELDS.map((f) => (
              <label key={f} htmlFor={`flag-${f}`} className="flex items-start gap-2 text-sm">
                <input id={`flag-${f}`} type="checkbox" className="mt-0.5 size-4 accent-[var(--color-brand-700)]" checked={flags[f]} onChange={(e) => setFlags((x) => ({ ...x, [f]: e.target.checked }))} />
                {FLAG_LABEL[f]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        <Button type="submit" disabled={busy || blocked}>{busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save changes</Button>
        {blocked && <p className="text-sm text-destructive">Fix the Fair Housing issues above to save.</p>}
      </div>
    </form>
  );
}
