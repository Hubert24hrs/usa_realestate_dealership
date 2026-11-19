"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, apiError } from "@/lib/api-client";
import { SignLeaseSchema } from "@/lib/validation/rental";

export function LeaseSignPanel({ leaseId, expectedName }: { leaseId: string; expectedName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(SignLeaseSchema),
    defaultValues: { signatureName: "", agreeElectronic: false as unknown as true, agreeTerms: false as unknown as true },
  });
  const { control, register, handleSubmit, formState, watch } = form;
  const e = formState.errors;
  const typed = watch("signatureName");

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const res = await api(`/api/rent/leases/${leaseId}/sign`, { method: "POST", json: v });
    if (!res.ok) return setError(apiError(res));
    router.push("/account/rentals?signed=1");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-3xl border-2 border-primary/30 bg-card p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><PenLine className="size-5" aria-hidden /> Sign your lease</h2>
        <p className="mt-1 text-sm text-muted-foreground">Type your full legal name{expectedName ? ` (${expectedName})` : ""} to sign electronically.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sig-name">Full legal name</Label>
        <Input id="sig-name" autoComplete="name" aria-invalid={Boolean(e.signatureName)} aria-describedby={e.signatureName ? "sig-name-err" : undefined} {...register("signatureName")} />
        {e.signatureName && <p id="sig-name-err" className="text-xs text-destructive">{e.signatureName.message}</p>}
      </div>
      <div aria-hidden className="flex h-16 items-end border-b-2 border-dashed px-2 pb-1">
        <span className="truncate font-[cursive] text-3xl text-ink/80 italic">{typed || " "}</span>
      </div>
      <div className="space-y-3">
        <Controller
          control={control}
          name="agreeElectronic"
          render={({ field }) => (
            <label htmlFor="sig-esign" className="flex items-start gap-2.5 text-sm">
              <Checkbox id="sig-esign" checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={Boolean(e.agreeElectronic)} className="mt-0.5" />
              <span>I agree to use electronic records and signatures for this lease. My typed name is my signature and has the same effect as a handwritten one. I can download a copy at any time.</span>
            </label>
          )}
        />
        {e.agreeElectronic && <p className="text-xs text-destructive">{e.agreeElectronic.message}</p>}
        <Controller
          control={control}
          name="agreeTerms"
          render={({ field }) => (
            <label htmlFor="sig-terms" className="flex items-start gap-2.5 text-sm">
              <Checkbox id="sig-terms" checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={Boolean(e.agreeTerms)} className="mt-0.5" />
              <span>I have read and agree to the lease terms above.</span>
            </label>
          )}
        />
        {e.agreeTerms && <p className="text-xs text-destructive">{e.agreeTerms.message}</p>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={formState.isSubmitting}>
        {formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Sign lease
      </Button>
    </form>
  );
}
