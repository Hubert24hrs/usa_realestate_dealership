"use client";

import { useState } from "react";
import Link from "@/components/app-link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { NumberField, ResultStat } from "@/components/tools/fields";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { rentAffordability } from "@/lib/finance/affordability";
import { formatMoney } from "@/lib/format";

export interface RentCity {
  slug: string;
  name: string;
  stateCode: string;
  medianRent: number;
}

const APP_FEE = 50;
const PET_DEPOSIT = 300;

export function RentAffordabilityCalculator({ cities, initialCity }: { cities: RentCity[]; initialCity: string }) {
  const [income, setIncome] = useState(72_000);
  const [debts, setDebts] = useState(350);
  const [savings, setSavings] = useState(6_000);
  const [applications, setApplications] = useState(2);
  const [moving, setMoving] = useState(1_200);
  const [pets, setPets] = useState(false);
  const [city, setCity] = useState(initialCity);

  const a = rentAffordability(income, debts);
  const target = Math.max(0, Math.floor(Math.min(a.thirtyPercent, a.afterDebts, a.fortyTimes) / 25) * 25);
  const lines = [
    { label: "First month's rent", amount: target },
    { label: "Security deposit (1 month)", amount: target },
    { label: `Application fees (${applications} × ${formatMoney(APP_FEE)})`, amount: applications * APP_FEE },
    ...(pets ? [{ label: "Pet deposit", amount: PET_DEPOSIT }] : []),
    { label: "Moving costs", amount: moving },
  ];
  const moveIn = lines.reduce((s, l) => s + l.amount, 0);
  const short = moveIn - savings;
  const c = cities.find((x) => x.slug === city) ?? cities[0];
  const share = c && c.medianRent ? target / c.medianRent : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section aria-labelledby="ra-inputs" className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 id="ra-inputs" className="font-semibold">Your budget</h2>
        <NumberField label="Annual household income (before tax)" kind="money" value={income} onChange={setIncome} max={50_000_000} />
        <NumberField label="Monthly debt payments" kind="money" value={debts} onChange={setDebts} max={1_000_000} help="Car, student loans, credit card minimums." />
        <NumberField label="Savings available to move" kind="money" value={savings} onChange={setSavings} max={10_000_000} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Applications" value={applications} onChange={(v) => setApplications(Math.round(v))} min={0} max={10} decimals={0} />
          <NumberField label="Moving costs" kind="money" value={moving} onChange={setMoving} max={100_000} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <Label htmlFor="ra-pets" className="font-normal">Moving with a pet</Label>
          <Switch id="ra-pets" checked={pets} onCheckedChange={setPets} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ra-city">Where are you looking?</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger id="ra-city" className="w-full"><SelectValue>{c ? `${c.name}, ${c.stateCode}` : "Choose a city"}</SelectValue></SelectTrigger>
            <SelectContent>{cities.map((x) => <SelectItem key={x.slug} value={x.slug}>{x.name}, {x.stateCode}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </section>

      <section aria-labelledby="ra-results" className="min-w-0 space-y-6">
        <h2 id="ra-results" className="sr-only">Results</h2>
        <div className="rounded-3xl border bg-card p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">A comfortable rent for you</p>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatMoney(target)}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
          <p className="mt-1 text-sm text-muted-foreground">The lowest of the three common tests below, so it passes landlord screening and leaves room for your other bills.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ResultStat label="30% of gross income" value={formatMoney(a.thirtyPercent)} sub="The classic budgeting rule" />
          <ResultStat label="Landlord screening" value={formatMoney(a.fortyTimes)} sub="Income ≥ 40× the monthly rent" />
          <ResultStat label="After your debts" value={formatMoney(a.afterDebts)} sub="Keeps total debt ≤ 36% of income" />
        </div>

        <div className="rounded-3xl border bg-card p-5 sm:p-6">
          <h3 className="font-semibold">Cash to move in</h3>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Estimated move in costs at {formatMoney(target)} per month</caption>
            <tbody className="divide-y">
              {lines.map((l) => (
                <tr key={l.label}>
                  <th scope="row" className="py-2 text-left font-normal">{l.label}</th>
                  <td className="py-2 text-right tabular-nums">{formatMoney(l.amount)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <th scope="row" className="py-2 text-left">Total</th>
                <td className="py-2 text-right tabular-nums">{formatMoney(moveIn)}</td>
              </tr>
            </tbody>
          </table>
          <p role="status" className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ${short > 0 ? "bg-warning/15" : "bg-success/10"}`}>
            {short > 0 ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground dark:text-warning" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />}
            {short > 0 ? `You're about ${formatMoney(short)} short. Look for move in specials or a lower deposit, or save a little longer.` : `Your savings cover it, with ${formatMoney(-short)} to spare.`}
          </p>
        </div>

        {c && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm">
              Median rent in <span className="font-semibold">{c.name}</span> is {formatMoney(c.medianRent)}/mo
              {share != null && <>. Your budget is {Math.round(share * 100)}% of that.</>}
            </p>
            <Link href={`/apartments-for-rent/${c.slug}?price=-${target}`} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Rentals up to {formatMoney(target)}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
