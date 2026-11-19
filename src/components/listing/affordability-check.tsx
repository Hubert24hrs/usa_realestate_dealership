"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, ThumbsUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maxAffordablePrice, verdictFor, type AffordabilityVerdict } from "@/lib/finance/affordability";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const VERDICTS: Record<AffordabilityVerdict, { label: string; tone: string; icon: React.ComponentType<{ className?: string }>; text: string }> = {
  comfortable: { label: "Comfortable", tone: "text-success", icon: CheckCircle2, text: "This price leaves room in your budget." },
  within: { label: "Within budget", tone: "text-success", icon: ThumbsUp, text: "This price fits the common 28/36 guideline." },
  stretch: { label: "A stretch", tone: "text-warning-foreground dark:text-warning", icon: AlertTriangle, text: "Slightly above the 28/36 guideline — consider a larger down payment or lower rate." },
  over: { label: "Over budget", tone: "text-destructive", icon: CircleAlert, text: "This home is above what these inputs comfortably support." },
};

export function AffordabilityCheck({ price, taxAnnual, hoaMonthly, defaultRate }: { price: number; taxAnnual: number | null; hoaMonthly: number | null; defaultRate: number }) {
  const [income, setIncome] = useState(Math.round((price * 0.22) / 1000) * 1000);
  const [debts, setDebts] = useState(600);
  const [down, setDown] = useState(Math.round(price * 0.2));
  const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;
  const { maxPrice, maxHousingPayment } = useMemo(
    () =>
      maxAffordablePrice({
        annualIncome: income,
        monthlyDebts: debts,
        downPayment: down,
        ratePct: defaultRate,
        termYears: 30,
        taxRate: taxAnnual ? taxAnnual / price : 0.011,
        insuranceRate: 0.0035,
        hoaMonthly: hoaMonthly ?? 0,
      }),
    [income, debts, down, defaultRate, taxAnnual, price, hoaMonthly],
  );
  const verdict = verdictFor(price, maxPrice);
  const V = VERDICTS[verdict];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="af-income">Household income (yearly)</Label>
          <Input id="af-income" inputMode="numeric" value={income.toLocaleString("en-US")} onChange={(e) => setIncome(num(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-debts">Monthly debts</Label>
          <Input id="af-debts" inputMode="numeric" value={debts.toLocaleString("en-US")} onChange={(e) => setDebts(num(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-down">Down payment</Label>
          <Input id="af-down" inputMode="numeric" value={down.toLocaleString("en-US")} onChange={(e) => setDown(num(e.target.value))} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-surface p-4" aria-live="polite">
        <V.icon className={cn("size-8 shrink-0", V.tone)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold", V.tone)}>{V.label}</p>
          <p className="text-sm text-muted-foreground">{V.text}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">You could afford up to</p>
          <p className="text-xl font-semibold">{formatMoney(maxPrice)}</p>
          <p className="text-xs text-muted-foreground">≈ {formatMoney(maxHousingPayment)}/mo housing</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Uses a 28% housing / 36% total debt-to-income guideline at {defaultRate.toFixed(2)}% for 30 years. Lenders may approve more or less.</p>
    </div>
  );
}
