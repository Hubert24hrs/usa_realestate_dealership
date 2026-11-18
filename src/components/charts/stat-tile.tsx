import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline, type SparkPoint } from "./sparkline";

export type Goodness = "up-good" | "down-good" | "neutral";

/**
 * Stat tile (dataviz figure contract): sentence-case label, auto-compact value in
 * proportional figures, signed delta vs a named period (color = direction × goodness,
 * always with an arrow icon + text, never color alone), optional 12-point trend.
 */
export function StatTile({
  label,
  value,
  delta,
  deltaLabel = "vs last year",
  goodness = "neutral",
  trend,
  format,
  className,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  goodness?: Goodness;
  trend?: SparkPoint[];
  format?: (v: number) => string;
  className?: string;
}) {
  const dir = delta == null ? 0 : delta > 0.0005 ? 1 : delta < -0.0005 ? -1 : 0;
  const tone =
    dir === 0 || goodness === "neutral"
      ? "text-muted-foreground"
      : (dir > 0) === (goodness === "up-good")
        ? "text-success"
        : "text-destructive";
  const Icon = dir > 0 ? ArrowUpRight : dir < 0 ? ArrowDownRight : ArrowRight;
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {delta != null && (
        <p className={cn("mt-0.5 inline-flex items-center gap-1 text-xs font-medium", tone)}>
          <Icon className="size-3.5" aria-hidden />
          <span>
            {delta > 0 ? "+" : ""}
            {(delta * 100).toFixed(1)}%
          </span>
          <span className="font-normal text-muted-foreground">{deltaLabel}</span>
        </p>
      )}
      {trend && trend.length > 1 && format && <Sparkline points={trend} format={format} label={label} />}
    </div>
  );
}
