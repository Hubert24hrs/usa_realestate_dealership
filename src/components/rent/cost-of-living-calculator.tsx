"use client";

import { useState } from "react";
import Link from "@/components/app-link";
import { ArrowLeftRight } from "lucide-react";
import { NumberField, ResultStat } from "@/components/tools/fields";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCompactPrice, formatMoney } from "@/lib/format";

const CATEGORIES = [
  ["housing", "Housing"],
  ["groceries", "Groceries"],
  ["transportation", "Transportation"],
  ["utilities", "Utilities"],
  ["healthcare", "Healthcare"],
  ["childcare", "Childcare"],
] as const;
type Cat = (typeof CATEGORIES)[number][0];

export interface ColCity {
  slug: string;
  name: string;
  stateCode: string;
  colIndex: number;
  col: Record<Cat, number>;
  medianRent: number;
  medianHomeValue: number;
}

const pct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 100))}%`;

function CityPicker({ id, label, value, onChange, cities }: { id: string; label: string; value: string; onChange: (v: string) => void; cities: ColCity[] }) {
  const c = cities.find((x) => x.slug === value);
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full"><SelectValue>{c ? `${c.name}, ${c.stateCode}` : "Choose a city"}</SelectValue></SelectTrigger>
        <SelectContent>{cities.map((x) => <SelectItem key={x.slug} value={x.slug}>{x.name}, {x.stateCode}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

export function CostOfLivingCalculator({ cities, initialFrom, initialTo }: { cities: ColCity[]; initialFrom: string; initialTo: string }) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [salary, setSalary] = useState(85_000);
  const A = cities.find((c) => c.slug === from) ?? cities[0]!;
  const B = cities.find((c) => c.slug === to) ?? cities[1] ?? cities[0]!;
  const ratio = B.colIndex / A.colIndex;
  const equivalent = salary * ratio;
  const rows = CATEGORIES.map(([key, label]) => ({ key, label, a: A.col[key], b: B.col[key], diff: B.col[key] / A.col[key] - 1 }));
  const scale = Math.max(0.25, ...rows.map((r) => Math.abs(r.diff)));

  return (
    <div className="space-y-6">
      <section aria-labelledby="col-inputs" className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 id="col-inputs" className="sr-only">Compare two cities</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <CityPicker id="col-from" label="I live in" value={from} onChange={setFrom} cities={cities} />
          <button
            type="button"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            className="grid size-10 shrink-0 place-items-center self-center rounded-full border hover:bg-accent sm:self-end"
            aria-label="Swap cities"
          >
            <ArrowLeftRight className="size-4" aria-hidden />
          </button>
          <CityPicker id="col-to" label="I'm moving to" value={to} onChange={setTo} cities={cities} />
          <NumberField className="sm:w-48" label="My salary" kind="money" value={salary} onChange={setSalary} max={50_000_000} />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          tone="primary"
          label={`Salary needed in ${B.name}`}
          value={formatMoney(equivalent)}
          sub={ratio === 1 ? "Same overall cost of living" : `${pct(ratio - 1)} overall cost of living vs. ${A.name}`}
        />
        <ResultStat label="Median rent" value={`${formatMoney(B.medianRent)}/mo`} sub={`${A.name}: ${formatMoney(A.medianRent)} (${pct(B.medianRent / A.medianRent - 1)})`} />
        <ResultStat label="Median home value" value={formatCompactPrice(B.medianHomeValue)} sub={`${A.name}: ${formatCompactPrice(A.medianHomeValue)} (${pct(B.medianHomeValue / A.medianHomeValue - 1)})`} />
      </div>

      <section aria-labelledby="col-cats" className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 id="col-cats" className="font-semibold">By category</h2>
        <p className="text-sm text-muted-foreground">How {B.name} compares with {A.name}. Index values use a U.S. average of 100.</p>
        <ul className="mt-5 space-y-3" aria-label={`Category cost differences, ${B.name} versus ${A.name}`}>
          {rows.map((r) => {
            const w = `${(Math.abs(r.diff) / scale) * 50}%`;
            const cheaper = r.diff < 0;
            return (
              <li key={r.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)_4rem]">
                <span className="font-medium">{r.label}</span>
                <span className="relative h-3 rounded-full bg-muted" aria-hidden>
                  <span className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground/40" />
                  <span
                    className="absolute inset-y-0 rounded-full"
                    style={cheaper ? { right: "50%", width: w, background: "var(--series-1)" } : { left: "50%", width: w, background: "var(--series-2)" }}
                  />
                </span>
                <span className="text-right font-semibold tabular-nums">
                  {pct(r.diff)}
                  <span className="sr-only"> ({cheaper ? "cheaper" : r.diff > 0 ? "more expensive" : "same"}; index {r.a} vs {r.b})</span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: "var(--series-1)" }} /> Cheaper in {B.name}</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: "var(--series-2)" }} /> Pricier in {B.name}</span>
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/apartments-for-rent/${B.slug}`} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Rentals in {B.name}</Link>
        <Link href={`/homes-for-sale/${B.slug}`} className="rounded-full border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">Homes for sale in {B.name}</Link>
        <Link href="/rent/trends" className="rounded-full border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">Rent trends</Link>
      </div>
    </div>
  );
}
