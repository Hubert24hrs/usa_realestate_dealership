"use client";

import { useMemo, useState } from "react";
import Link from "@/components/app-link";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { NumberField, ResultStat } from "@/components/tools/fields";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maxAffordablePrice } from "@/lib/finance/affordability";
import { paymentBreakdown } from "@/lib/finance/mortgage";
import { formatCompactPrice, formatMoney } from "@/lib/format";

const PROFILES = {
  conservative: { label: "Conservative", front: 0.28, back: 0.36, note: "28% housing / 36% total debt: the classic rule of thumb." },
  moderate: { label: "Moderate", front: 0.31, back: 0.43, note: "31% / 43%: common for FHA and many conventional approvals." },
  stretch: { label: "Stretch", front: 0.36, back: 0.45, note: "36% / 45%: possible with strong credit and reserves, but tight." },
} as const;
type ProfileKey = keyof typeof PROFILES;

export function AffordabilityCalculator({ defaultRate }: { defaultRate: number }) {
  const [income, setIncome] = useState(110_000);
  const [debts, setDebts] = useState(450);
  const [down, setDown] = useState(60_000);
  const [rate, setRate] = useState(defaultRate);
  const [term, setTerm] = useState(30);
  const [taxPct, setTaxPct] = useState(1.1);
  const [insPct, setInsPct] = useState(0.35);
  const [hoa, setHoa] = useState(0);
  const [profile, setProfile] = useState<ProfileKey>("conservative");

  const p = PROFILES[profile];
  const result = useMemo(
    () => maxAffordablePrice({ annualIncome: income, monthlyDebts: debts, downPayment: down, ratePct: rate, termYears: term, taxRate: taxPct / 100, insuranceRate: insPct / 100, hoaMonthly: hoa, frontDti: p.front, backDti: p.back }),
    [income, debts, down, rate, term, taxPct, insPct, hoa, p.front, p.back],
  );
  const comfortable = useMemo(
    () => maxAffordablePrice({ annualIncome: income, monthlyDebts: debts, downPayment: down, ratePct: rate, termYears: term, taxRate: taxPct / 100, insuranceRate: insPct / 100, hoaMonthly: hoa, frontDti: 0.28, backDti: 0.36 }).maxPrice,
    [income, debts, down, rate, term, taxPct, insPct, hoa],
  );
  const at = paymentBreakdown({ price: result.maxPrice, downPayment: Math.min(down, result.maxPrice), ratePct: rate, termYears: term, propertyTaxAnnual: (result.maxPrice * taxPct) / 100, insuranceAnnual: (result.maxPrice * insPct) / 100, hoaMonthly: hoa });
  const gross = income / 12;
  const downPctAtMax = result.maxPrice > 0 ? Math.min(100, (down / result.maxPrice) * 100) : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section aria-labelledby="af-inputs" className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 id="af-inputs" className="font-semibold">Your finances</h2>
        <NumberField label="Annual household income (before tax)" kind="money" value={income} onChange={setIncome} max={50_000_000} />
        <NumberField label="Monthly debt payments" kind="money" value={debts} onChange={setDebts} max={1_000_000} help="Car, student loan, credit card minimums, child support, not rent or utilities." />
        <NumberField label="Cash for down payment" kind="money" value={down} onChange={setDown} max={100_000_000} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Interest rate" kind="percent" value={rate} onChange={setRate} max={20} />
          <div className="space-y-1.5">
            <Label htmlFor="af-term">Loan term</Label>
            <Select value={String(term)} onValueChange={(v) => setTerm(Number(v))}>
              <SelectTrigger id="af-term" className="w-full"><SelectValue>{term} years</SelectValue></SelectTrigger>
              <SelectContent>{[30, 20, 15].map((t) => <SelectItem key={t} value={String(t)}>{t} years</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Property tax rate" kind="percent" value={taxPct} onChange={setTaxPct} max={5} />
          <NumberField label="Insurance rate" kind="percent" value={insPct} onChange={setInsPct} max={5} />
        </div>
        <NumberField label="HOA dues / mo" kind="money" value={hoa} onChange={setHoa} max={20_000} />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Debt to income limits</legend>
          <RadioGroup value={profile} onValueChange={(v) => setProfile(v as ProfileKey)} className="gap-2">
            {(Object.keys(PROFILES) as ProfileKey[]).map((k) => (
              <Label key={k} htmlFor={`af-${k}`} className="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem id={`af-${k}`} value={k} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">{PROFILES[k].label}</span>
                  <span className="block text-xs text-muted-foreground">{PROFILES[k].note}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
      </section>

      <section aria-labelledby="af-results" className="min-w-0 space-y-6">
        <h2 id="af-results" className="sr-only">Results</h2>
        <div className="rounded-3xl border bg-card p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">You could afford a home up to</p>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatMoney(result.maxPrice)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            with a {formatMoney(at.total)}/mo payment ({gross > 0 ? Math.round((at.total / gross) * 100) : 0}% of gross income) and {downPctAtMax.toFixed(1)}% down.
          </p>
          {result.maxPrice > 0 && (
            <div className="mt-5">
              <SegmentedBar
                ariaLabel="Monthly payment at your maximum price"
                format={(v) => formatMoney(v)}
                segments={[
                  { key: "pi", label: "Principal & interest", value: at.principalAndInterest, color: "var(--series-1)" },
                  { key: "tax", label: "Property taxes", value: at.propertyTax, color: "var(--series-2)" },
                  { key: "ins", label: "Homeowners insurance", value: at.insurance, color: "var(--series-3)" },
                  { key: "hoa", label: "HOA dues", value: at.hoa, color: "var(--series-4)" },
                  { key: "pmi", label: "Mortgage insurance (PMI)", value: at.pmi, color: "var(--series-5)" },
                ]}
              />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ResultStat label="Comfortable price" value={formatCompactPrice(comfortable)} sub="At 28% / 36% limits" />
          <ResultStat label="Max housing payment" value={`${formatMoney(result.maxHousingPayment)}/mo`} sub={`${Math.round(p.front * 100)}% front / ${Math.round(p.back * 100)}% back end DTI`} />
          <ResultStat label="Loan amount" value={formatCompactPrice(at.loanAmount)} sub={`${term}-year at ${rate}%`} />
        </div>

        {result.maxPrice <= 0 ? (
          <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">Your current debts use up the allowed budget. Paying down a balance or adding income raises what you can afford.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm"><span className="font-semibold">Shop with confidence.</span> Browse homes in your range, then get preapproved.</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/homes-for-sale?price=-${Math.round(comfortable)}`} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Homes up to {formatCompactPrice(comfortable)}</Link>
              <Link href="/mortgage/preapproval" className="rounded-full border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">Get preapproved</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
