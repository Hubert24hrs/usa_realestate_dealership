"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCompactPrice, formatPrice } from "@/lib/format";

export interface PricePoint {
  date: string;
  price: number;
  event: string;
}

const EVENT_LABEL: Record<string, string> = {
  LISTED: "Listed",
  PRICE_CHANGE: "Price change",
  PENDING: "Pending",
  SOLD: "Sold",
  DELISTED: "Delisted",
  RELISTED: "Relisted",
  RENTED: "Rented",
};

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || max || 1;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? mag * 10;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.01; v += step) ticks.push(v);
  return ticks;
}

/** Single-series price history line (2px), event markers with surface ring, crosshair tooltip. */
export function PriceHistoryChart({ points }: { points: PricePoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => [...points].sort((a, b) => +new Date(a.date) - +new Date(b.date)), [points]);
  if (data.length < 2) return null;
  const height = 200;
  const m = { top: 12, right: 16, bottom: 26, left: 56 };
  const t0 = +new Date(data[0]!.date);
  const t1 = +new Date(data[data.length - 1]!.date);
  const prices = data.map((d) => d.price);
  const ticks = niceTicks(Math.min(...prices) * 0.97, Math.max(...prices) * 1.02);
  const yMin = ticks[0]!;
  const yMax = ticks[ticks.length - 1]!;
  const innerW = Math.max(1, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;
  const x = (d: string) => m.left + ((+new Date(d) - t0) / Math.max(1, t1 - t0)) * innerW;
  const y = (v: number) => m.top + (1 - (v - yMin) / Math.max(1, yMax - yMin)) * innerH;
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(d.date).toFixed(1)},${y(d.price).toFixed(1)}`).join(" ");
  // Evenly spaced year ticks across the whole range (≤ 6 labels), not only years with events.
  const y0 = new Date(t0).getFullYear() + 1;
  const y1 = new Date(t1).getFullYear();
  const yearStep = Math.max(1, Math.ceil((y1 - y0 + 1) / 6));
  const years: number[] = [];
  for (let yr = y0; yr <= y1; yr += yearStep) years.push(yr);

  const onMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    data.forEach((d, i) => {
      if (Math.abs(x(d.date) - px) < Math.abs(x(data[best]!.date) - px)) best = i;
    });
    setActive(best);
  };

  return (
    <div
      ref={ref}
      className="relative w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ height }}
      tabIndex={0}
      role="group"
      aria-label="Price history chart. Use left and right arrow keys to read each event. The full history is in the table below."
      onPointerMove={onMove}
      onPointerLeave={() => setActive(null)}
      onBlur={() => setActive(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1));
        if (e.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
      }}
    >
      {width > 0 && (
        <svg width={width} height={height} aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={m.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[11px] tabular-nums">{formatCompactPrice(t)}</text>
            </g>
          ))}
          {years.map((yr) => {
            const xx = x(new Date(yr, 0, 1).toISOString());
            if (xx < m.left || xx > width - m.right) return null;
            return <text key={yr} x={xx} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">{yr}</text>;
          })}
          <path d={path} fill="none" stroke="var(--chart-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active != null && <line x1={x(data[active]!.date)} x2={x(data[active]!.date)} y1={m.top} y2={height - m.bottom} stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.5} />}
          {data.map((d, i) => (
            <circle key={i} cx={x(d.date)} cy={y(d.price)} r={i === active ? 5.5 : 4} fill={d.event === "SOLD" ? "var(--ink)" : "var(--chart-accent)"} stroke="var(--card)" strokeWidth={2} />
          ))}
        </svg>
      )}
      {active != null && data[active] && (
        <div role="status" className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-[var(--shadow-raised)]" style={{ left: Math.min(Math.max(x(data[active].date), 70), width - 70) }}>
          <p className="font-semibold">{formatPrice(data[active].price)}</p>
          <p className="text-muted-foreground">{EVENT_LABEL[data[active].event] ?? data[active].event} · {new Date(data[active].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
      )}
    </div>
  );
}

export { EVENT_LABEL };
