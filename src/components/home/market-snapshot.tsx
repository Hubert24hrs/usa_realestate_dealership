"use client";

import { useState } from "react";
import Link from "@/components/app-link";
import { ArrowRight, Table2 } from "lucide-react";
import { StatTile } from "@/components/charts/stat-tile";
import { formatCompactPrice, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MarketSeries } from "@/server/home";

const yoy = (series: number[]) => (series.length >= 13 && series[series.length - 13] ? series[series.length - 1]! / series[series.length - 13]! - 1 : null);

export function MarketSnapshot({ markets }: { markets: MarketSeries[] }) {
  const [active, setActive] = useState(markets[0]?.slug ?? "");
  const [asTable, setAsTable] = useState(false);
  const market = markets.find((m) => m.slug === active) ?? markets[0];
  if (!market) return null;
  const last12 = market.months.slice(-12);
  const latest = last12[last12.length - 1]!;
  const tiles = [
    { label: "Median list price", value: formatCompactPrice(latest.list), delta: yoy(market.months.map((m) => m.list)), trend: last12.map((m) => ({ label: m.label, value: m.list })), format: formatCompactPrice },
    { label: "Median sold price", value: formatCompactPrice(latest.sold), delta: yoy(market.months.map((m) => m.sold)), trend: last12.map((m) => ({ label: m.label, value: m.sold })), format: formatCompactPrice },
    { label: "Median days on market", value: `${latest.dom} days`, delta: yoy(market.months.map((m) => m.dom)), trend: last12.map((m) => ({ label: m.label, value: m.dom })), format: (v: number) => `${Math.round(v)} days` },
    { label: "Homes for sale", value: formatNumber(latest.inventory), delta: yoy(market.months.map((m) => m.inventory)), trend: last12.map((m) => ({ label: m.label, value: m.inventory })), format: formatNumber },
    { label: "Median rent", value: `$${latest.rent.toLocaleString("en-US")}/mo`, delta: yoy(market.months.map((m) => m.rent)), trend: last12.map((m) => ({ label: m.label, value: m.rent })), format: (v: number) => `$${Math.round(v).toLocaleString("en-US")}` },
  ];

  return (
    <section aria-labelledby="market-title" className="container-page py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Market snapshot</p>
          <h2 id="market-title" className="mt-1 font-display text-[1.75rem] font-semibold tracking-tight">How the market is moving</h2>
          <p className="mt-1 text-sm text-muted-foreground">Last 12 months · change from a year earlier</p>
        </div>
        <button type="button" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-accent">
          <Table2 className="size-4" aria-hidden /> {asTable ? "Show charts" : "View as table"}
        </button>
      </div>

      <div role="tablist" aria-label="Choose a market" className="mt-5 flex flex-wrap gap-1.5">
        {markets.map((m) => (
          <button
            key={m.slug}
            role="tab"
            type="button"
            aria-selected={m.slug === market.slug}
            onClick={() => setActive(m.slug)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", m.slug === market.slug ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}
          >
            {m.name}, {m.state}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={`${market.name} market data`} className="mt-5">
        {asTable ? (
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">{market.name} monthly market data</caption>
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  {["Month", "Median list", "Median sold", "Days on market", "Homes for sale", "Median rent"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...last12].reverse().map((m) => (
                  <tr key={m.label} className="border-t">
                    <th scope="row" className="px-3 py-2 text-left font-medium">{m.label}</th>
                    <td className="px-3 py-2">{formatCompactPrice(m.list)}</td>
                    <td className="px-3 py-2">{formatCompactPrice(m.sold)}</td>
                    <td className="px-3 py-2">{m.dom}</td>
                    <td className="px-3 py-2">{formatNumber(m.inventory)}</td>
                    <td className="px-3 py-2">${m.rent.toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {tiles.map((t) => (
              <StatTile key={t.label} label={t.label} value={t.value} delta={t.delta} trend={t.trend} format={t.format} />
            ))}
          </div>
        )}
        <Link href={`/${market.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Explore {market.name} real estate <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
