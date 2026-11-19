"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, apiError } from "@/lib/api-client";
import { PROPERTY_TYPE_LABELS } from "@/lib/domain";
import { checkFairHousing } from "@/lib/fair-housing";
import { AdminListingCreateSchema, CATEGORIES, PROPERTY_TYPES, TRANSACTIONS } from "@/lib/validation/admin";
import { selectCls } from "./controls";

const TX_FOR: Record<(typeof CATEGORIES)[number], (typeof TRANSACTIONS)[number][]> = {
  RESIDENTIAL: ["SALE"],
  RENTAL: ["RENT"],
  COMMERCIAL: ["SALE", "LEASE"],
  LAND: ["SALE"],
};
const TX_LABEL = { SALE: "For sale", RENT: "For rent", LEASE: "For lease" } as const;

export function NewListingForm({ cities }: { cities: Array<{ slug: string; name: string; stateCode: string }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ category: "RESIDENTIAL", transactionType: "SALE", propertyType: "SINGLE_FAMILY", streetAddress: "", unit: "", citySlug: "", zip: "", price: "", description: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: value };
      if (k === "category") next.transactionType = TX_FOR[value as keyof typeof TX_FOR][0]!;
      return next;
    });
  };
  const findings = useMemo(() => checkFairHousing(form.description), [form.description]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = AdminListingCreateSchema.safeParse({ ...form, price: form.price.replace(/[^\d]/g, "") });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      document.getElementById(`nl-${String(parsed.error.issues[0]!.path[0])}`)?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await api<{ id: string }>("/api/admin/listings", { method: "POST", json: parsed.data });
    setBusy(false);
    if (!res.ok) return toast.error(apiError(res));
    toast.success("Draft created. Add photos, then publish");
    router.push(`/admin/listings/${res.data.id}`);
  };

  const field = (k: keyof typeof form, label: string, input: React.ReactNode) => (
    <div>
      <label htmlFor={`nl-${k}`} className="mb-1.5 block text-sm font-medium">{label}</label>
      {input}
      {errors[k] && <p id={`nl-${k}-err`} className="mt-1 text-sm text-destructive">{errors[k]}</p>}
    </div>
  );
  const aria = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `nl-${k}-err` : undefined });

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-3xl border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {field("category", "Category", (
          <select id="nl-category" value={form.category} onChange={set("category")} className={`${selectCls} h-9 w-full`}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
          </select>
        ))}
        {field("transactionType", "Transaction", (
          <select id="nl-transactionType" value={form.transactionType} onChange={set("transactionType")} className={`${selectCls} h-9 w-full`}>
            {TX_FOR[form.category as keyof typeof TX_FOR].map((t) => <option key={t} value={t}>{TX_LABEL[t]}</option>)}
          </select>
        ))}
        {field("propertyType", "Property type", (
          <select id="nl-propertyType" value={form.propertyType} onChange={set("propertyType")} className={`${selectCls} h-9 w-full`}>
            {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t] ?? t}</option>)}
          </select>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        {field("streetAddress", "Street address", <Input id="nl-streetAddress" autoComplete="off" value={form.streetAddress} onChange={set("streetAddress")} {...aria("streetAddress")} />)}
        {field("unit", "Unit", <Input id="nl-unit" value={form.unit} onChange={set("unit")} />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px_200px]">
        {field("citySlug", "City", (
          <select id="nl-citySlug" value={form.citySlug} onChange={set("citySlug")} className={`${selectCls} h-9 w-full`} {...aria("citySlug")}>
            <option value="">Choose a market…</option>
            {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}, {c.stateCode}</option>)}
          </select>
        ))}
        {field("zip", "ZIP", <Input id="nl-zip" inputMode="numeric" maxLength={5} value={form.zip} onChange={set("zip")} {...aria("zip")} />)}
        {field("price", form.transactionType === "SALE" ? "Price ($)" : "Rent ($/mo)", <Input id="nl-price" inputMode="numeric" value={form.price} onChange={set("price")} {...aria("price")} />)}
      </div>
      {field("description", "Description", <Textarea id="nl-description" rows={6} value={form.description} onChange={set("description")} {...aria("description")} />)}
      {findings.length > 0 && (
        <div role="status" className="space-y-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {findings.map((f, i) => (
            <p key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden /><span><strong>“{f.phrase}”</strong>: {f.reason}</span></p>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">The map pin is placed approximately within the city until the address is geocoded. New listings start as drafts.</p>
      <Button type="submit" disabled={busy || findings.some((f) => f.severity === "block")}>{busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Create draft</Button>
    </form>
  );
}
