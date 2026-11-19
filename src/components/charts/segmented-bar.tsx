"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Segment {
  key: string;
  label: string;
  value: number;
  /** CSS color (use the --series-N tokens, in fixed order). */
  color: string;
  /** Label text color inside the fill (white or near-black by the fill's luminance). */
  ink?: "light" | "dark";
}

/**
 * Tall segmented bar (dataviz figure): one whole split into parts, 28px, 4px
 * corners, 2px surface gaps, share printed inside only when it fits, legend
 * lists names in block order with amounts, hover/focus gives the full readout.
 */
export function SegmentedBar({ segments, format, ariaLabel }: { segments: Segment[]; format: (v: number) => string; ariaLabel: string }) {
  const parts = segments.filter((s) => s.value > 0);
  const total = parts.reduce((a, s) => a + s.value, 0);
  const [active, setActive] = useState<string | null>(null);
  if (!total) return null;
  return (
    <div>
      <div role="img" aria-label={`${ariaLabel}: ${parts.map((s) => `${s.label} ${format(s.value)} (${Math.round((s.value / total) * 100)}%)`).join(", ")}`} className="flex h-7 w-full gap-[2px]">
        {parts.map((s) => {
          const share = s.value / total;
          const showLabel = share >= 0.12;
          return (
            <div
              key={s.key}
              tabIndex={0}
              onPointerEnter={() => setActive(s.key)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(s.key)}
              onBlur={() => setActive(null)}
              className={cn("relative flex items-center rounded-[4px] px-2 text-[0.7rem] font-semibold outline-none transition-[filter] focus-visible:ring-2 focus-visible:ring-ring", active === s.key && "brightness-110")}
              style={{ width: `${share * 100}%`, background: s.color, color: s.ink === "dark" ? "#1a1a19" : "#ffffff" }}
            >
              {showLabel && <span aria-hidden>{Math.round(share * 100)}%</span>}
              {active === s.key && (
                <span role="status" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-[var(--shadow-raised)]">
                  <span className="font-semibold">{format(s.value)}</span> <span className="text-muted-foreground">{s.label} · {Math.round(share * 100)}%</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        {parts.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
              {s.label}
            </span>
            <span className="font-medium text-foreground">{format(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
