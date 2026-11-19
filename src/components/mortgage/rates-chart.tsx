"use client";

import { LineChart } from "@/components/charts/line-chart";
import type { RateHistory } from "@/server/rates";

const SHOWN = ["30-year-fixed", "15-year-fixed", "5-1-arm", "30-year-fha"] as const;
const COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

export function RatesChart({ history }: { history: RateHistory[] }) {
  // Fixed product → color mapping, so a product keeps its color everywhere.
  const series = SHOWN.map((slug, i) => {
    const h = history.find((x) => x.slug === slug);
    return h ? { key: slug, label: h.product.replace(/^./, (c) => c.toUpperCase()), color: COLORS[i]!, values: h.points.map((p) => p.rate) } : null;
  }).filter((s): s is NonNullable<typeof s> => s != null);
  const base = history.find((h) => h.slug === SHOWN[0]) ?? history[0];
  if (!base || !series.length) return null;
  const labels = base.points.map((p) => new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }));
  return (
    <LineChart
      labels={labels}
      series={series}
      format={(v) => `${v.toFixed(3)}%`}
      axisFormat={(v) => `${v.toFixed(2)}%`}
      ariaLabel="Sample mortgage rates by product over the last 12 weeks"
      caption="Sample weekly mortgage rates by product"
    />
  );
}
