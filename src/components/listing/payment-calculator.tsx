"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { NumberField } from "@/components/tools/fields";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { paymentBreakdown } from "@/lib/finance/mortgage";
import { formatMoney } from "@/lib/format";

export function PaymentCalculator({ price, taxAnnual, hoaMonthly, defaultRate, compact = false }: { price: number; taxAnnual: number | null; hoaMonthly: number | null; defaultRate: number; compact?: boolean }) {
  const [homePrice, setHomePrice] = useState(price);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(defaultRate);
  const [term, setTerm] = useState(30);
  const [tax, setTax] = useState(taxAnnual ?? Math.round(price * 0.011));
  const [insurance, setInsurance] = useState(Math.round(price * 0.0035));
  const [hoa, setHoa] = useState(hoaMonthly ?? 0);

  const b = useMemo(
    () => paymentBreakdown({ price: homePrice, downPayment: (homePrice * downPct) / 100, ratePct: rate, termYears: term, propertyTaxAnnual: tax, insuranceAnnual: insurance, hoaMonthly: hoa }),
    [homePrice, downPct, rate, term, tax, insurance, hoa],
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Estimated monthly payment</p>
          <p className="text-3xl font-semibold tracking-tight">{formatMoney(b.total)}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
        </div>
        <p className="text-xs text-muted-foreground">Loan {formatMoney(b.loanAmount)} · {Math.round(b.ltv * 100)}% LTV</p>
      </div>
      <SegmentedBar
        ariaLabel="Monthly payment breakdown"
        format={(v) => formatMoney(v)}
        segments={[
          { key: "pi", label: "Principal & interest", value: b.principalAndInterest, color: "var(--series-1)" },
          { key: "tax", label: "Property taxes", value: b.propertyTax, color: "var(--series-2)" },
          { key: "ins", label: "Homeowners insurance", value: b.insurance, color: "var(--series-3)" },
          { key: "hoa", label: "HOA dues", value: b.hoa, color: "var(--series-4)" },
          { key: "pmi", label: "Mortgage insurance (PMI)", value: b.pmi, color: "var(--series-5)" },
        ]}
      />
      <div className={compact ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
        <NumberField id="pc-price" label="Home price" kind="money" value={homePrice} onChange={setHomePrice} max={100_000_000} />
        <div className="space-y-1.5">
          <Label htmlFor="pc-down">Down payment · {downPct}% ({formatMoney((homePrice * downPct) / 100)})</Label>
          <Slider id="pc-down" min={0} max={50} step={1} value={[downPct]} onValueChange={([v]) => setDownPct(v ?? 20)} aria-label="Down payment percent" className="py-2" />
        </div>
        <NumberField id="pc-rate" label="Interest rate" kind="percent" value={rate} onChange={setRate} max={20} />

        <div className="space-y-1.5">
          <Label htmlFor="pc-term">Loan term</Label>
          <Select value={String(term)} onValueChange={(v) => setTerm(Number(v))}>
            <SelectTrigger id="pc-term" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[30, 20, 15, 10].map((t) => <SelectItem key={t} value={String(t)}>{t}-year fixed</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <NumberField id="pc-tax" label="Property tax (per year)" kind="money" value={tax} onChange={setTax} max={1_000_000} />
        <NumberField id="pc-ins" label="Insurance (per year)" kind="money" value={insurance} onChange={setInsurance} max={500_000} />
        <NumberField id="pc-hoa" label="HOA (per month)" kind="money" value={hoa} onChange={setHoa} max={50_000} />
      </div>
      <p className="text-xs text-muted-foreground">
        PMI is estimated at 0.6% of the loan per year while your down payment is under 20%. Estimates only — not a loan offer. <Link href="/mortgage/preapproval" className="font-medium text-primary hover:underline">Get pre-approved</Link> for an exact rate.
      </p>
    </div>
  );
}
