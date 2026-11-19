"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, apiError } from "@/lib/api-client";
import { TCPA_TEXT } from "@/lib/validation/lead";

const selectCls = "h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** "Find a listing agent" request — routed to a top agent serving the chosen market. */
export function SellerConsultForm({ cities }: { cities: Array<{ slug: string; name: string; stateCode: string }> }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [routedTo, setRoutedTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  if (state === "sent") {
    return (
      <div role="status" className="rounded-3xl border bg-card p-6">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <p className="mt-3 text-lg font-semibold">Request sent{routedTo ? ` to ${routedTo}` : ""}</p>
        <p className="mt-1 text-sm text-muted-foreground">Expect a call or email shortly to set up a free consultation and pricing review.</p>
      </div>
    );
  }
  return (
    <form
      className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (!consent) return setError("Please agree to be contacted.");
        setState("sending");
        setError(null);
        const res = await api<{ routedTo?: string | null }>("/api/leads", {
          method: "POST",
          json: { type: "SELLER_CONSULT", name: f.get("name"), email: f.get("email"), phone: f.get("phone") ?? "", address: f.get("address") ?? "", timeline: f.get("timeline") ?? "", citySlug: f.get("city"), message: f.get("message") ?? "", consent: true, website: f.get("website") ?? "", source: "/sell" },
        });
        if (!res.ok) {
          setState("idle");
          return setError(apiError(res));
        }
        setRoutedTo(res.data.routedTo ?? null);
        setState("sent");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="sc-name">Name</Label><Input id="sc-name" name="name" required minLength={2} autoComplete="name" /></div>
        <div className="space-y-1.5"><Label htmlFor="sc-email">Email</Label><Input id="sc-email" name="email" type="email" required autoComplete="email" /></div>
        <div className="space-y-1.5"><Label htmlFor="sc-phone">Phone (optional)</Label><Input id="sc-phone" name="phone" type="tel" autoComplete="tel" /></div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-city">Market</Label>
          <select id="sc-city" name="city" required className={selectCls} defaultValue="">
            <option value="" disabled>Choose a city</option>
            {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}, {c.stateCode}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="sc-address">Property address</Label><Input id="sc-address" name="address" maxLength={200} autoComplete="street-address" /></div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-timeline">When do you want to sell?</Label>
          <select id="sc-timeline" name="timeline" className={selectCls} defaultValue="1–3 months">
            {["ASAP", "1 to 3 months", "3 to 6 months", "6+ months", "Just exploring"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label htmlFor="sc-consent" className="flex items-start gap-2.5 text-xs text-muted-foreground">
        <Checkbox id="sc-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
        <span>{TCPA_TEXT}</span>
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={state === "sending"}>{state === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden />} Match me with a listing agent</Button>
    </form>
  );
}
