"use client";

import { useState } from "react";
import { LineChart } from "@/components/charts/line-chart";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface TrendCity {
  slug: string;
  name: string;
  stateCode: string;
  months: Array<{ label: string; rent: number }>;
}

/** Each slot owns its color, so swapping a city never repaints the others. */
const SLOT_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];
const NONE = "none";

export function RentTrendsChart({ cities, initial }: { cities: TrendCity[]; initial: string[] }) {
  const [slots, setSlots] = useState<string[]>(() => [0, 1, 2, 3].map((i) => initial[i] ?? NONE));
  const [range, setRange] = useState<12 | 24>(24);
  const picked = slots.map((s, i) => ({ city: cities.find((c) => c.slug === s), color: SLOT_COLORS[i]! })).filter((p): p is { city: TrendCity; color: string } => Boolean(p.city));
  const base = picked[0]?.city ?? cities[0];
  if (!base) return null;
  const n = Math.min(range, base.months.length);
  const labels = base.months.slice(-n).map((m) => m.label);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {slots.map((s, i) => (
          <div key={i} className="space-y-1.5">
            <Label htmlFor={`rt-${i}`} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-[3px] w-4 rounded-full" style={{ background: SLOT_COLORS[i] }} />
              City {i + 1}
            </Label>
            <Select value={s} onValueChange={(v) => setSlots((prev) => prev.map((x, j) => (j === i ? v : x)))}>
              <SelectTrigger id={`rt-${i}`} className="w-full">
                <SelectValue>{cities.find((c) => c.slug === s)?.name ?? "None"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {i > 0 && <SelectItem value={NONE}>None</SelectItem>}
                {cities.map((c) => (
                  <SelectItem key={c.slug} value={c.slug} disabled={slots.includes(c.slug) && s !== c.slug}>
                    {c.name}, {c.stateCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div role="group" aria-label="Time range" className="inline-flex rounded-full border p-0.5">
        {([12, 24] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => setRange(r)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium", range === r ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
          >
            {r} months
          </button>
        ))}
      </div>
      <LineChart
        labels={labels}
        series={picked.map((p) => ({ key: p.city.slug, label: p.city.name, color: p.color, values: p.city.months.slice(-n).map((m) => m.rent) }))}
        format={(v) => `${formatMoney(v)}/mo`}
        axisFormat={(v) => `$${(v / 1000).toFixed(v % 1000 ? 1 : 0)}K`}
        ariaLabel="Median monthly rent by city"
        caption="Median monthly rent by city and month"
      />
    </div>
  );
}
