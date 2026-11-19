"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart as LineIcon, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LineSeries {
  key: string;
  label: string;
  /** Categorical token in fixed order, e.g. var(--series-1). Color follows the entity, never its rank. */
  color: string;
  values: Array<number | null>;
}

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || Math.abs(max) || 1;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? mag * 10;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.01; v += step) ticks.push(Number(v.toFixed(10)));
  if (ticks.length < 2) ticks.push(start + step);
  return ticks;
}

/**
 * Multi-series line chart (≤ 4 series): 2px lines, legend, selective end labels, crosshair tooltip,
 * arrow-key reading, optional reference marker and a table view (identity is never color-alone).
 */
export function LineChart({
  labels,
  series,
  format,
  axisFormat,
  ariaLabel,
  caption,
  height = 260,
  marker = null,
  includeZero = false,
  className,
}: {
  labels: string[];
  series: LineSeries[];
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  ariaLabel: string;
  caption: string;
  height?: number;
  marker?: { index: number; label: string } | null;
  includeZero?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = labels.length;
  const values = useMemo(() => series.flatMap((s) => s.values.filter((v): v is number => v != null && Number.isFinite(v))), [series]);
  const tickFmt = axisFormat ?? format;
  const showEndLabels = series.length > 1 && series.length <= 4 && width >= 520;
  const m = { top: 16, right: showEndLabels ? 112 : 18, bottom: 28, left: 64 };
  const innerW = Math.max(1, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;

  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 1;
  const pad = (hi - lo) * 0.06 || Math.abs(hi) * 0.05 || 1;
  const ticks = niceTicks(includeZero ? Math.min(0, lo) : lo - pad, hi + pad);
  const yMin = ticks[0]!;
  const yMax = ticks[ticks.length - 1]!;
  const x = (i: number) => m.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => m.top + (1 - (v - yMin) / Math.max(1e-9, yMax - yMin)) * innerH;

  const pathFor = (s: LineSeries) => {
    let d = "";
    let pen = false;
    s.values.forEach((v, i) => {
      if (v == null || !Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  // End labels at each series' last value, nudged apart so they never collide.
  const endLabels = showEndLabels
    ? series
        .map((s) => {
          let i = s.values.length - 1;
          while (i >= 0 && s.values[i] == null) i--;
          return i >= 0 ? { key: s.key, label: s.label, color: s.color, yy: y(s.values[i]!), xx: x(i) } : null;
        })
        .filter((v): v is NonNullable<typeof v> => v != null)
        .sort((a, b) => a.yy - b.yy)
    : [];
  for (let k = 1; k < endLabels.length; k++) if (endLabels[k]!.yy - endLabels[k - 1]!.yy < 15) endLabels[k]!.yy = endLabels[k - 1]!.yy + 15;

  // X labels: every `xStep` points, plus the last point when it isn't crowded by the previous label.
  const xStep = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 72))));
  const xShown = labels.map((_, i) => i).filter((i) => i % xStep === 0);
  if (n > 1 && xShown[xShown.length - 1] !== n - 1 && n - 1 - xShown[xShown.length - 1]! >= Math.ceil(xStep * 0.6)) xShown.push(n - 1);
  const onMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - m.left) / innerW) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {series.length > 1 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-[3px] w-4 rounded-full" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent"
        >
          {asTable ? <LineIcon className="size-3.5" aria-hidden /> : <Table2 className="size-3.5" aria-hidden />}
          {asTable ? "Show chart" : "View as table"}
        </button>
      </div>

      <div
        ref={ref}
        hidden={asTable}
        className="relative w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-label={`${ariaLabel}. Use the left and right arrow keys to read values; a table view is available.`}
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
          else if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
          else if (e.key === "Home") setActive(0);
          else if (e.key === "End") setActive(n - 1);
          else return;
          e.preventDefault();
        }}
      >
        {width > 0 && n > 0 && (
          <svg width={width} height={height} aria-hidden>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
                <text x={m.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[11px] tabular-nums">{tickFmt(t)}</text>
              </g>
            ))}
            {xShown.map((i) => (
              <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">{labels[i]}</text>
            ))}
            {marker && marker.index >= 0 && marker.index < n && (
              <g>
                <line x1={x(marker.index)} x2={x(marker.index)} y1={m.top} y2={height - m.bottom} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="4 4" />
                <text x={Math.min(x(marker.index) + 6, width - m.right - 4)} y={m.top + 10} textAnchor={x(marker.index) + 120 > width - m.right ? "end" : "start"} className="fill-foreground text-[11px] font-medium">{marker.label}</text>
              </g>
            )}
            {series.map((s) => (
              <path key={s.key} d={pathFor(s)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {endLabels.map((e) => (
              <g key={e.key}>
                <line x1={e.xx + 6} x2={e.xx + 14} y1={e.yy} y2={e.yy} stroke={e.color} strokeWidth={3} strokeLinecap="round" />
                <text x={e.xx + 18} y={e.yy} dominantBaseline="middle" className="fill-foreground text-[11px]">{e.label.length > 15 ? `${e.label.slice(0, 14)}…` : e.label}</text>
              </g>
            ))}
            {active != null && (
              <g>
                <line x1={x(active)} x2={x(active)} y1={m.top} y2={height - m.bottom} stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.5} />
                {series.map((s) =>
                  s.values[active] != null ? <circle key={s.key} cx={x(active)} cy={y(s.values[active]!)} r={4.5} fill={s.color} stroke="var(--card)" strokeWidth={2} /> : null,
                )}
              </g>
            )}
          </svg>
        )}
        {active != null && labels[active] != null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-[var(--shadow-raised)]"
            style={{ left: Math.min(Math.max(x(active) + 12, 8), Math.max(8, width - 180)) }}
          >
            <p className="font-semibold">{labels[active]}</p>
            <ul className="mt-1 space-y-0.5">
              {series.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-medium tabular-nums">{s.values[active] != null ? format(s.values[active]!) : "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {asTable && (
        <div className="max-h-96 overflow-auto rounded-2xl border">
          <table className="w-full text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Period</th>
                {series.map((s) => <th key={s.key} scope="col" className="px-3 py-2 font-medium">{s.label}</th>)}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {labels.map((l, i) => (
                <tr key={`${l}-${i}`} className="border-t">
                  <th scope="row" className="px-3 py-1.5 text-left font-medium">{l}</th>
                  {series.map((s) => <td key={s.key} className="px-3 py-1.5">{s.values[i] != null ? format(s.values[i]!) : "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
