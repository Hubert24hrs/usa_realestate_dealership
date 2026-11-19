"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { LineChart } from "@/components/charts/line-chart";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { NumberField, ResultStat } from "@/components/tools/fields";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { paymentBreakdown, payoffWithExtra } from "@/lib/finance/mortgage";
import { formatCompactPrice, formatMoney } from "@/lib/format";

export interface MortgageInitial {
  price: number;
  downPct: number;
  rate: number;
  term: number;
  taxAnnual: number;
  insuranceAnnual: number;
  hoa: number;
  extra: number;
}

const monthYear = (months: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1 + months);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
const span = (months: number) => {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo` : ""].filter(Boolean).join(" ") || "0 mo";
};

export function MortgageCalculator({ initial }: { initial: MortgageInitial }) {
  const [price, setPrice] = useState(initial.price);
  const [downPct, setDownPct] = useState(initial.downPct);
  const [rate, setRate] = useState(initial.rate);
  const [term, setTerm] = useState(initial.term);
  const [tax, setTax] = useState(initial.taxAnnual);
  const [insurance, setInsurance] = useState(initial.insuranceAnnual);
  const [hoa, setHoa] = useState(initial.hoa);
  const [extra, setExtra] = useState(initial.extra);
  const [showSchedule, setShowSchedule] = useState(false);

  const b = useMemo(
    () => paymentBreakdown({ price, downPayment: (price * downPct) / 100, ratePct: rate, termYears: term, propertyTaxAnnual: tax, insuranceAnnual: insurance, hoaMonthly: hoa }),
    [price, downPct, rate, term, tax, insurance, hoa],
  );
  const base = useMemo(() => payoffWithExtra(b.loanAmount, rate, term, 0), [b.loanAmount, rate, term]);
  const accel = useMemo(() => (extra > 0 ? payoffWithExtra(b.loanAmount, rate, term, extra) : null), [b.loanAmount, rate, term, extra]);
  const schedule = accel ?? base;

  // Keep the URL shareable without adding history entries.
  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams({ price: String(Math.round(price)), down: String(downPct), rate: String(rate), term: String(term), tax: String(Math.round(tax)), ins: String(Math.round(insurance)), hoa: String(Math.round(hoa)) });
      if (extra > 0) q.set("extra", String(Math.round(extra)));
      window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
    }, 400);
    return () => clearTimeout(t);
  }, [price, downPct, rate, term, tax, insurance, hoa, extra]);

  const years = Array.from({ length: term + 1 }, (_, i) => i);
  const balanceSeries = (s: typeof base) => years.map((y) => (y === 0 ? b.loanAmount : (s.yearlyBalance[y - 1] ?? 0)));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section aria-labelledby="mc-inputs" className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 id="mc-inputs" className="font-semibold">Loan details</h2>
        <NumberField label="Home price" kind="money" value={price} onChange={setPrice} max={100_000_000} />
        <div className="space-y-1.5">
          <Label htmlFor="mc-down">Down payment · {downPct}% ({formatMoney((price * downPct) / 100)})</Label>
          <Slider id="mc-down" min={0} max={60} step={1} value={[downPct]} onValueChange={([v]) => setDownPct(v ?? 20)} aria-label="Down payment percent" className="py-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Interest rate" kind="percent" value={rate} onChange={setRate} max={20} />
          <div className="space-y-1.5">
            <Label htmlFor="mc-term">Loan term</Label>
            <Select value={String(term)} onValueChange={(v) => setTerm(Number(v))}>
              <SelectTrigger id="mc-term" className="w-full"><SelectValue>{term}-year fixed</SelectValue></SelectTrigger>
              <SelectContent>
                {[30, 20, 15, 10].map((t) => <SelectItem key={t} value={String(t)}>{t}-year fixed</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Property tax / yr" kind="money" value={tax} onChange={setTax} max={1_000_000} />
          <NumberField label="Insurance / yr" kind="money" value={insurance} onChange={setInsurance} max={500_000} />
        </div>
        <NumberField label="HOA dues / mo" kind="money" value={hoa} onChange={setHoa} max={50_000} />
        <NumberField label="Extra principal / mo" kind="money" value={extra} onChange={setExtra} max={100_000} help="Optional — see how much interest and time you save." />
      </section>

      <section aria-labelledby="mc-results" className="min-w-0 space-y-6">
        <h2 id="mc-results" className="sr-only">Results</h2>
        <div className="rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">Estimated monthly payment</p>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatMoney(b.total)}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
            </div>
            <p className="text-xs text-muted-foreground">Loan {formatMoney(b.loanAmount)} · {Math.round(b.ltv * 100)}% LTV</p>
          </div>
          <div className="mt-5">
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
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ResultStat label="Total interest" value={formatMoney(schedule.totalInterest)} sub={accel ? `Saves ${formatMoney(base.totalInterest - accel.totalInterest)}` : `Over ${term} years`} />
          <ResultStat label="Payoff date" value={monthYear(schedule.months - 1)} sub={accel ? `${span(base.months - accel.months)} sooner` : `${schedule.months} payments`} />
          <ResultStat label="Total of payments" value={formatCompactPrice(b.loanAmount + schedule.totalInterest)} sub="Principal + interest" />
        </div>

        <div className="rounded-3xl border bg-card p-5 sm:p-6">
          <h3 className="font-semibold">Loan balance over time</h3>
          <p className="text-sm text-muted-foreground">Remaining principal at the end of each year{accel ? ", with and without your extra payments" : ""}.</p>
          <LineChart
            className="mt-4"
            labels={years.map((y) => (y === 0 ? "Start" : `Yr ${y}`))}
            series={[
              { key: "standard", label: accel ? "Standard schedule" : "Balance", color: "var(--series-1)", values: balanceSeries(base) },
              ...(accel ? [{ key: "extra", label: "With extra payments", color: "var(--series-2)", values: balanceSeries(accel) }] : []),
            ]}
            format={(v) => formatMoney(v)}
            axisFormat={(v) => formatCompactPrice(v)}
            includeZero
            ariaLabel="Remaining loan balance by year"
            caption="Remaining loan balance by year"
          />
        </div>

        <div className="rounded-3xl border bg-card">
          <button type="button" onClick={() => setShowSchedule((v) => !v)} aria-expanded={showSchedule} aria-controls="mc-schedule" className="flex w-full items-center justify-between gap-2 p-5 text-left font-semibold sm:px-6">
            Year-by-year amortization schedule
            <ChevronDown className={`size-4 transition-transform ${showSchedule ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {showSchedule && (
            <div id="mc-schedule" className="max-h-[28rem] overflow-auto border-t">
              <table className="w-full text-sm">
                <caption className="sr-only">Amortization by year</caption>
                <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Year</th>
                    <th scope="col" className="px-4 py-2 font-medium">Principal paid</th>
                    <th scope="col" className="px-4 py-2 font-medium">Interest paid</th>
                    <th scope="col" className="px-4 py-2 font-medium">Ending balance</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {schedule.yearly.map((y) => (
                    <tr key={y.year} className="border-t">
                      <th scope="row" className="px-4 py-1.5 text-left font-medium">{y.year}</th>
                      <td className="px-4 py-1.5">{formatMoney(y.principal)}</td>
                      <td className="px-4 py-1.5">{formatMoney(y.interest)}</td>
                      <td className="px-4 py-1.5">{formatMoney(y.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm"><span className="font-semibold">Ready for a real number?</span> A pre-approval locks in what you can borrow.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/mortgage/preapproval" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Get pre-approved</Link>
            <Link href={`/homes-for-sale?price=-${Math.round(price)}`} className="rounded-full border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">Homes up to {formatCompactPrice(price)}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
