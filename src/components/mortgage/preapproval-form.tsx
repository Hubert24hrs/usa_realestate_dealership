"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/use-me";
import { api, apiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import { TCPA_TEXT } from "@/lib/validation/lead";

const money = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .refine((v) => /^\$?[\d,]+(\.\d{0,2})?$/.test(v), `Enter ${label} as a number`);

const CREDIT = ["740+", "680-739", "620-679", "Below 620", "Not sure"] as const;
const TIMELINE = ["Within 30 days", "1–3 months", "3–6 months", "6+ months / exploring"] as const;

const FormSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
  phone: z.string().trim().max(30).regex(/^[+()\d\s.-]*$/, "Use digits, spaces, ( ) + . or -"),
  annualIncome: money("your income"),
  purchasePrice: money("a target price"),
  downPayment: money("your down payment"),
  creditRange: z.enum(CREDIT),
  timeline: z.enum(TIMELINE),
  message: z.string().trim().max(1500),
  consent: z.boolean().refine((v) => v, "Please agree to be contacted"),
  website: z.string().optional(),
});
type FormValues = z.infer<typeof FormSchema>;
const toNumber = (v: string) => Number(v.replace(/[$,]/g, "")) || 0;

interface Receipt {
  reference: string;
  partnerName: string;
  nextSteps: string[];
}

export function PreapprovalForm() {
  const { data: me } = useMe();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: "", email: "", phone: "", annualIncome: "", purchasePrice: "", downPayment: "", creditRange: "Not sure", timeline: "1–3 months", message: "", consent: false, website: "" },
  });
  const { register, handleSubmit, formState, setValue, watch, getValues } = form;

  // Prefill from the signed-in profile without clobbering anything typed already.
  useEffect(() => {
    const u = me?.user;
    if (!u) return;
    if (!getValues("name") && u.name) setValue("name", u.name);
    if (!getValues("email") && u.email) setValue("email", u.email);
  }, [me?.user, getValues, setValue]);

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const price = toNumber(v.purchasePrice);
    const down = toNumber(v.downPayment);
    if (down > price) {
      form.setError("downPayment", { message: "Down payment can't exceed the price" });
      return;
    }
    const res = await api<{ partner?: Receipt | null }>("/api/leads", {
      method: "POST",
      json: {
        type: "PREAPPROVAL",
        name: v.name,
        email: v.email,
        phone: v.phone,
        annualIncome: toNumber(v.annualIncome),
        purchasePrice: price,
        downPayment: down,
        creditRange: v.creditRange,
        message: [`Timeline: ${v.timeline}`, v.message].filter(Boolean).join("\n\n"),
        consent: true,
        website: v.website,
        source: "/mortgage/preapproval",
      },
    });
    if (!res.ok) return setError(apiError(res));
    setReceipt(res.data.partner ?? { reference: "Received", partnerName: "CITI VIEW lending partners", nextSteps: [] });
  });

  if (receipt) {
    return (
      <div role="status" className="rounded-3xl border bg-card p-6 sm:p-8">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <h2 className="mt-3 font-display text-2xl font-semibold">Request sent to {receipt.partnerName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reference <strong className="font-mono text-foreground">{receipt.reference}</strong> · we emailed you a copy.
        </p>
        {receipt.nextSteps.length > 0 && (
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm">
            {receipt.nextSteps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild><Link href="/homes-for-sale">Start touring homes</Link></Button>
          <Button asChild variant="outline"><Link href="/mortgage/closing-costs">Estimate closing costs</Link></Button>
        </div>
      </div>
    );
  }

  const err = formState.errors;
  const field = (id: keyof FormValues, label: string, el: React.ReactNode, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pa-${id}`}>{label}</Label>
      {el}
      {hint && !err[id] && <p className="text-xs text-muted-foreground">{hint}</p>}
      {err[id] && <p id={`pa-${id}-err`} className="text-xs text-destructive">{String(err[id]?.message)}</p>}
    </div>
  );
  const aria = (id: keyof FormValues) => ({ id: `pa-${id}`, "aria-invalid": Boolean(err[id]), "aria-describedby": err[id] ? `pa-${id}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-3xl border bg-card p-5 sm:p-6">
      <fieldset className="space-y-4">
        <legend className="font-semibold">About you</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Full name", <Input autoComplete="name" {...aria("name")} {...register("name")} />)}
          {field("email", "Email", <Input type="email" autoComplete="email" {...aria("email")} {...register("email")} />)}
        </div>
        {field("phone", "Phone (optional)", <Input type="tel" autoComplete="tel" {...aria("phone")} {...register("phone")} />)}
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="font-semibold">Your purchase</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {field("annualIncome", "Annual income", <Input inputMode="numeric" placeholder="$95,000" {...aria("annualIncome")} {...register("annualIncome")} />, "Before taxes")}
          {field("purchasePrice", "Target price", <Input inputMode="numeric" placeholder="$425,000" {...aria("purchasePrice")} {...register("purchasePrice")} />)}
          {field("downPayment", "Down payment", <Input inputMode="numeric" placeholder="$40,000" {...aria("downPayment")} {...register("downPayment")} />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pa-credit">Estimated credit score</Label>
            <Select value={watch("creditRange")} onValueChange={(v) => setValue("creditRange", v as FormValues["creditRange"])}>
              <SelectTrigger id="pa-credit" className="w-full"><SelectValue>{watch("creditRange")}</SelectValue></SelectTrigger>
              <SelectContent>{CREDIT.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pa-timeline">When do you plan to buy?</Label>
            <Select value={watch("timeline")} onValueChange={(v) => setValue("timeline", v as FormValues["timeline"])}>
              <SelectTrigger id="pa-timeline" className="w-full"><SelectValue>{watch("timeline")}</SelectValue></SelectTrigger>
              <SelectContent>{TIMELINE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {field("message", "Anything else? (optional)", <Textarea rows={3} placeholder="e.g. first-time buyer, self-employed, interested in FHA or VA" {...aria("message")} {...register("message")} />)}
        {watch("purchasePrice") && watch("downPayment") && toNumber(watch("purchasePrice")) > 0 && (
          <p className="text-xs text-muted-foreground">
            That&apos;s {Math.round((toNumber(watch("downPayment")) / toNumber(watch("purchasePrice"))) * 1000) / 10}% down — a loan of about {formatMoney(Math.max(0, toNumber(watch("purchasePrice")) - toNumber(watch("downPayment"))))}.
          </p>
        )}
      </fieldset>
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...register("website")} />
      <div className="space-y-1.5">
        <label htmlFor="pa-consent" className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <Checkbox id="pa-consent" checked={watch("consent")} onCheckedChange={(v) => setValue("consent", v === true, { shouldValidate: formState.isSubmitted })} aria-invalid={Boolean(err.consent)} className="mt-0.5" />
          <span>{TCPA_TEXT} Requesting a pre-approval doesn&apos;t affect your credit; the lender asks permission before any credit check.</span>
        </label>
        {err.consent && <p className="text-xs text-destructive">{err.consent.message}</p>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={formState.isSubmitting}>
        {formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Request pre-approval
      </Button>
    </form>
  );
}
