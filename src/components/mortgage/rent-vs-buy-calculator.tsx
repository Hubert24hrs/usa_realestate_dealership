"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LineChart } from "@/components/charts/line-chart";
import { NumberField, ResultStat } from "@/components/tools/fields";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { rentVsBuy } from "@/lib/finance/rent-vs-buy";
import { formatCompactPrice, formatMoney } from "@/lib/format";

export function RentVsBuyCalculator({ defaultRate, defaultRent, defaultPrice }: { defaultRate: number; defaultRent: number; defaultPrice: number }) {
  const [homePrice, setHomePrice] = useState(defaultPrice);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(defaultRate);
  const [years, setYears] = useState(10);
  const [appreciation, setAppreciation] = useState(3.5);
  const [taxPct, setTaxPct] = useState(1.1);
  const [insurance, setInsurance] = useState(1_800);
  const [maintenancePct, setMaintenancePct] = useState(1);
  const [hoa, setHoa] = useState(0);
  const [buyCost, setBuyCost] = useState(3);
  const [sellCost, setSellCost] = useState(6);
  const [rent, setRent] = useState(defaultRent);
  const [rentGrowth, setRentGrowth] = useState(3);
  const [invest, setInvest] = useState(5);

  const r = useMemo(
    () =>
      rentVsBuy({
        homePrice,
        downPct,
        ratePct: rate,
        termYears: 30,
        years,
        appreciationPct: appreciation,
        propertyTaxPct: taxPct,
        insuranceAnnual: insurance,
        maintenancePct,
        hoaMonthly: hoa,
        buyCostPct: buyCost,
        sellCostPct: sellCost,
        rentMonthly: rent,
        rentGrowthPct: rentGrowth,
        rentersInsuranceMonthly: 15,
        investReturnPct: invest,
      }),
    [homePrice, downPct, rate, years, appreciation, taxPct, insurance, maintenancePct, hoa, buyCost, sellCost, rent, rentGrowth, invest],
  );
  const last = r.rows[r.rows.length - 1];
  const diff = last ? last.ownerNetWorth - last.renterNetWorth : 0;
  const buyWins = diff >= 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <section aria-labelledby="rvb-inputs" className="space-y-5 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 id="rvb-inputs" className="font-semibold">Your scenario</h2>
        <div className="space-y-1.5">
          <Label htmlFor="rvb-years">How long you&apos;ll stay · {years} years</Label>
          <Slider id="rvb-years" min={1} max={30} step={1} value={[years]} onValueChange={([v]) => setYears(v ?? 10)} aria-label="Years you plan to stay" className="py-2" />
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground">Buying</legend>
          <NumberField label="Home price" kind="money" value={homePrice} onChange={setHomePrice} max={100_000_000} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Down payment" kind="percent" value={downPct} onChange={setDownPct} max={100} decimals={1} />
            <NumberField label="Mortgage rate" kind="percent" value={rate} onChange={setRate} max={20} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Home appreciation / yr" kind="percent" value={appreciation} onChange={setAppreciation} min={-10} max={20} decimals={2} />
            <NumberField label="Property tax rate" kind="percent" value={taxPct} onChange={setTaxPct} max={5} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Insurance / yr" kind="money" value={insurance} onChange={setInsurance} max={200_000} />
            <NumberField label="Maintenance / yr" kind="percent" value={maintenancePct} onChange={setMaintenancePct} max={10} decimals={2} help="Share of home value" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="HOA / mo" kind="money" value={hoa} onChange={setHoa} max={20_000} />
            <NumberField label="Buying costs" kind="percent" value={buyCost} onChange={setBuyCost} max={15} decimals={1} />
            <NumberField label="Selling costs" kind="percent" value={sellCost} onChange={setSellCost} max={15} decimals={1} />
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground">Renting & investing</legend>
          <NumberField label="Monthly rent" kind="money" value={rent} onChange={setRent} max={1_000_000} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Rent increase / yr" kind="percent" value={rentGrowth} onChange={setRentGrowth} min={-10} max={20} decimals={2} />
            <NumberField label="Investment return / yr" kind="percent" value={invest} onChange={setInvest} min={-10} max={20} decimals={2} />
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="rvb-results" className="min-w-0 space-y-6">
        <h2 id="rvb-results" className="sr-only">Results</h2>
        <div className="rounded-3xl border bg-card p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">After {years} years</p>
          <p className="text-3xl font-semibold tracking-tight text-balance">
            {buyWins ? "Buying" : "Renting"} comes out ahead by <span className="tabular-nums">{formatMoney(Math.abs(diff))}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {r.breakEvenYear ? `Buying breaks even in year ${r.breakEvenYear}.` : `Buying doesn't break even within ${years} years at these assumptions.`}
          </p>
          <LineChart
            className="mt-5"
            labels={r.rows.map((row) => `Yr ${row.year}`)}
            series={[
              { key: "buy", label: "If you buy", color: "var(--series-1)", values: r.rows.map((row) => row.ownerNetWorth) },
              { key: "rent", label: "If you rent", color: "var(--series-2)", values: r.rows.map((row) => row.renterNetWorth) },
            ]}
            format={(v) => formatMoney(v)}
            axisFormat={(v) => formatCompactPrice(v)}
            marker={r.breakEvenYear ? { index: r.breakEvenYear - 1, label: `Break-even · yr ${r.breakEvenYear}` } : null}
            ariaLabel="Net worth by year if you buy versus if you rent"
            caption="Net worth by year: buying vs renting"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ResultStat label="Cash needed to buy" value={formatCompactPrice(r.upfrontCash)} sub="Down payment + buying costs" />
          <ResultStat label="Owning, first year" value={`${formatMoney(r.firstYearOwnerMonthly)}/mo`} sub="Mortgage, tax, insurance, upkeep, HOA" />
          <ResultStat label="Renting, first year" value={`${formatMoney(r.firstYearRentMonthly)}/mo`} sub="Rent + renters insurance" />
        </div>
        <div className="rounded-2xl border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">How this works</p>
          <p className="mt-1">
            Both paths start with the same cash. Whichever is cheaper each month invests the difference at your investment return. Buying&apos;s net worth is the home&apos;s value after selling costs, minus the loan balance, plus any invested savings. PMI applies until the loan falls below 80% of the price. Income-tax effects and capital-gains taxes are ignored.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/mortgage/affordability" className="rounded-full border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">How much home can I afford?</Link>
          <Link href="/rent/affordability" className="rounded-full border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">How much rent can I afford?</Link>
        </div>
      </section>
    </div>
  );
}
