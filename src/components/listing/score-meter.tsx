import { cn } from "@/lib/utils";

/**
 * Meter (dataviz figure): fill carries the value; the unfilled track is a lighter
 * step of the same ramp. Always paired with a numeric value and a text label.
 */
export function ScoreMeter({ label, value, max = 100, descriptor, tone = "brand" }: { label: string; value: number | null; max?: number; descriptor?: string; tone?: "brand" | "risk" }) {
  if (value == null) return null;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const risk = tone === "risk";
  const severity = pct >= 70 ? "high" : pct >= 40 ? "mid" : "low";
  const fill = risk ? (severity === "high" ? "bg-destructive" : severity === "mid" ? "bg-warning" : "bg-success") : "bg-primary";
  const track = risk ? (severity === "high" ? "bg-destructive/15" : severity === "mid" ? "bg-warning/25" : "bg-success/15") : "bg-primary/15";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm">
          <span className="font-semibold">{value}</span>
          <span className="text-muted-foreground">/{max}</span>
          {descriptor && <span className="ml-1.5 text-xs text-muted-foreground">{descriptor}</span>}
        </span>
      </div>
      <div className={cn("h-2 overflow-hidden rounded-full", track)} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={`${value} of ${max}${descriptor ? `, ${descriptor}` : ""}`}>
        <div className={cn("h-full rounded-full", fill)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function scoreDescriptor(score: number | null): string {
  if (score == null) return "";
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Very good";
  if (score >= 50) return "Good";
  if (score >= 25) return "Some options";
  return "Limited";
}

export function riskDescriptor(level: number | null, max = 10): string {
  if (level == null) return "";
  const r = level / max;
  if (r >= 0.8) return "Severe";
  if (r >= 0.6) return "Major";
  if (r >= 0.4) return "Moderate";
  if (r >= 0.2) return "Minor";
  return "Minimal";
}
