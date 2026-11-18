"use client";

import { useEffect, useRef, useState } from "react";

export interface SparkPoint {
  label: string;
  value: number;
}

/**
 * Stat-tile trend (dataviz contract): 2px line in the de-emphasis hue, current
 * period as an 8px accent dot with a 2px surface ring, crosshair + tooltip that
 * snaps to the nearest point on hover and on keyboard focus (←/→).
 */
export function Sparkline({ points, format, label, height = 44 }: { points: SparkPoint[]; format: (v: number) => string; label: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 6;
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * Math.max(1, width - pad * 2);
  const y = (v: number) => (max === min ? height / 2 : pad + (1 - (v - min) / (max - min)) * (height - pad * 2));
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points.length - 1;
  const shown = active ?? last;

  const onPointer = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left - pad) / Math.max(1, rect.width - pad * 2);
    setActive(Math.max(0, Math.min(last, Math.round(rel * last))));
  };

  return (
    <div
      ref={ref}
      className="relative mt-2 w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      style={{ height }}
      tabIndex={0}
      role="group"
      aria-label={`${label} trend, last ${points.length} months. Use left and right arrow keys to read values.`}
      onPointerMove={onPointer}
      onPointerLeave={() => setActive(null)}
      onBlur={() => setActive(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? last) - 1));
        if (e.key === "ArrowRight") setActive((a) => Math.min(last, (a ?? last) + 1));
      }}
    >
      {width > 0 && (
        <svg width={width} height={height} aria-hidden className="overflow-visible">
          <line x1={pad} x2={width - pad} y1={height - 1} y2={height - 1} stroke="var(--chart-grid)" strokeWidth={1} />
          <path d={d} fill="none" stroke="var(--chart-deemph)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active != null && <line x1={x(active)} x2={x(active)} y1={0} y2={height} stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.55} />}
          <circle cx={x(shown)} cy={y(points[shown]!.value)} r={4} fill={shown === last ? "var(--chart-accent)" : "var(--chart-deemph)"} stroke="var(--card)" strokeWidth={2} />
        </svg>
      )}
      {active != null && points[active] && (
        <div
          role="status"
          className="pointer-events-none absolute -top-11 z-10 -translate-x-1/2 rounded-lg border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-[var(--shadow-raised)]"
          style={{ left: Math.min(Math.max(x(active), 48), width - 48) }}
        >
          <span className="font-semibold text-foreground">{format(points[active].value)}</span>
          <span className="ml-1.5 text-muted-foreground">{points[active].label}</span>
        </div>
      )}
    </div>
  );
}
