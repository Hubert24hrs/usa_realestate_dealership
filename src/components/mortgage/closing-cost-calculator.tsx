"use client";

import { useMemo, useState } from "react";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { NumberField, ResultStat } from "@/components/tools/fields";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { estimateClosingCosts, STATE_PROFILES, stateProfile } from "@/lib/finance/closing-costs";
import { formatMoney, formatPercent } from "@/lib/format";

const GROUP_COLOR: Record<string, { color: string }> = {
  lender: { color: "var(--series-1)" },
  title: { color: "var(--series-2)" },
  government: { color: "var(--series-3)" },
  prepaids: { color: "var(--series-4)" },
};

export function ClosingCostCalculator({ defaultRate, initialState }: { defaultRate: number; initialState: string }) {
  const [state, setState] = useState(initialState);
  const [price, setPrice] = useState(450_000);
  const [downPct, setDownPct] = useState(10);
  const [rate, setRate] = useState(defaultRate);
  const [points, setPoints] = useState(0);
  const [cash, setCash] = useState(false);
  const [survey, setSurvey] = useState(true);
  const [sellerCredit, setSellerCredit] = useState(0);
  const [earnest, setEarnest] = useState(5_000);
  const [closingDay, setClosingDay] = useState(15);

  const profile = stateProfile(state);
  const est = useMemo(
    () => estimateClosingCosts({ price, downPayment: (price * downPct) / 100, ratePct: rate, points, state, cash, survey, sellerCredit, earnestMoney: earnest, closingDay }),
    [price, downPct, rate, points, state, cash, survey, sellerCredit, earnest, closingDay],
  );
  const down = cash ? price : (price * downPct) / 100;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section aria-labelledby="cc-inputs" className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6">
        <h2 id="cc-inputs" className="font-semibold">Purchase details</h2>
        <div className="space-y-1.5">
          <Label htmlFor="cc-state">State</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger id="cc-state" className="w-full"><SelectValue>{profile.name}</SelectValue></SelectTrigger>
            <SelectContent>{STATE_PROFILES.map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <NumberField label="Purchase price" kind="money" value={price} onChange={setPrice} max={100_000_000} />
        <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <Label htmlFor="cc-cash" className="font-normal">Paying cash (no mortgage)</Label>
          <Switch id="cc-cash" checked={cash} onCheckedChange={setCash} />
        </div>
        {!cash && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="cc-down">Down payment · {downPct}% ({formatMoney(down)})</Label>
              <Slider id="cc-down" min={0} max={60} step={1} value={[downPct]} onValueChange={([v]) => setDownPct(v ?? 10)} aria-label="Down payment percent" className="py-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Interest rate" kind="percent" value={rate} onChange={setRate} max={20} />
              <NumberField label="Discount points" value={points} onChange={setPoints} max={4} decimals={2} help="1 point = 1% of the loan" />
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Earnest money paid" kind="money" value={earnest} onChange={setEarnest} max={10_000_000} />
          <NumberField label="Seller credits" kind="money" value={sellerCredit} onChange={setSellerCredit} max={10_000_000} />
        </div>
        <NumberField label="Closing day of month" value={closingDay} onChange={(v) => setClosingDay(Math.round(v))} min={1} max={31} decimals={0} help="Prepaid interest runs from closing to month end." />
        <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <Label htmlFor="cc-survey" className="font-normal">Include a property survey</Label>
          <Switch id="cc-survey" checked={survey} onCheckedChange={setSurvey} />
        </div>
      </section>

      <section aria-labelledby="cc-results" className="min-w-0 space-y-6">
        <h2 id="cc-results" className="sr-only">Results</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <ResultStat tone="primary" label="Estimated closing costs" value={formatMoney(est.closingCosts)} sub={`${formatPercent(est.closingCostPct * 100)} of the price`} />
          <ResultStat label="Estimated cash to close" value={formatMoney(est.cashToClose)} sub={`Down payment ${formatMoney(down)} + costs − credits − earnest money`} />
        </div>

        <div className="rounded-3xl border bg-card p-5 sm:p-6">
          <SegmentedBar
            ariaLabel="Closing costs by category"
            format={(v) => formatMoney(v)}
            segments={est.groups.map((g) => ({ key: g.key, label: g.label, value: g.total, color: GROUP_COLOR[g.key]!.color }))}
          />
          <div className="mt-6 space-y-6">
            {est.groups.map((g) => (
              <table key={g.key} className="w-full text-sm">
                <caption className="mb-2 text-left font-semibold">{g.label}</caption>
                <tbody className="divide-y">
                  {g.lines.map((l) => (
                    <tr key={l.key}>
                      <th scope="row" className="py-2 pr-3 text-left font-normal">
                        {l.label}
                        {l.note && <span className="block text-xs text-muted-foreground">{l.note}</span>}
                      </th>
                      <td className="py-2 text-right tabular-nums">{formatMoney(l.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <th scope="row" className="py-2 text-left">Subtotal</th>
                    <td className="py-2 text-right tabular-nums">{formatMoney(g.total)}</td>
                  </tr>
                </tbody>
              </table>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {profile.attorneyClosing ? `An attorney customarily conducts closings in ${profile.name}. ` : ""}
          Transfer taxes and title costs follow typical local custom for {profile.name}; your contract can assign them differently, and county or city taxes may apply.
        </p>
      </section>
    </div>
  );
}
