"use client";

import { useState } from "react";
import Link from "@/components/app-link";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ITEMS = [
  { key: "firstTime", label: "I haven't owned a home in the last three years", weight: 2 },
  { key: "occupy", label: "I'll live in the home as my primary residence", weight: 2 },
  { key: "income", label: "My household income is moderate for my area", weight: 2 },
  { key: "credit", label: "My credit score is 620 or higher", weight: 1 },
  { key: "course", label: "I'm willing to take a homebuyer education course", weight: 1 },
  { key: "savings", label: "I can put in a small amount of my own savings", weight: 1 },
] as const;

/** Self-check only — programs set their own rules; this is not an eligibility decision. */
export function DpaChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const score = ITEMS.reduce((a, i) => a + (checked[i.key] ? i.weight : 0), 0);
  const max = ITEMS.reduce((a, i) => a + i.weight, 0);
  const message =
    score >= max - 1
      ? "You match the profile most programs are built for. Ask a participating lender which programs you can combine."
      : score >= 5
        ? "Many programs could fit. Income limits and owner-occupancy are usually the deciding rules — a lender can check them for you."
        : score > 0
          ? "Some programs may still fit — several cities and employers run programs without first-time-buyer rules."
          : "Check the boxes that apply to see how you line up with typical program rules.";

  return (
    <div className="rounded-3xl border bg-card p-5 sm:p-6">
      <h2 className="font-semibold">Could I qualify? A quick self-check</h2>
      <ul className="mt-4 space-y-2">
        {ITEMS.map((i) => (
          <li key={i.key}>
            <Label htmlFor={`dpa-${i.key}`} className="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <Checkbox id={`dpa-${i.key}`} checked={Boolean(checked[i.key])} onCheckedChange={(v) => setChecked((c) => ({ ...c, [i.key]: v === true }))} className="mt-0.5" />
              <span className="text-sm">{i.label}</span>
            </Label>
          </li>
        ))}
      </ul>
      <p role="status" className="mt-4 rounded-xl bg-surface p-3 text-sm">{message}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        A self-check, not an eligibility decision. <Link href="/mortgage/preapproval" className="font-medium text-primary hover:underline">Ask a partner lender</Link> about programs where you&apos;re buying.
      </p>
    </div>
  );
}
