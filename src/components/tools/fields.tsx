"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Kind = "money" | "percent" | "number" | "years";

interface NumberFieldProps {
  label: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  kind?: Kind;
  min?: number;
  max?: number;
  /** Decimal places kept when the field is not being edited. */
  decimals?: number;
  help?: React.ReactNode;
  suffix?: string;
  className?: string;
  id?: string;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Numeric input that keeps the raw text while you type (so "6." or "1,2" survive),
 * commits every valid number immediately, and re-formats on blur.
 */
export function NumberField({ label, value, onChange, kind = "number", min = 0, max = 1e12, decimals, help, suffix, className, id }: NumberFieldProps) {
  const autoId = useId();
  const fid = id ?? autoId;
  const [draft, setDraft] = useState<string | null>(null);
  const places = decimals ?? (kind === "percent" ? 3 : kind === "money" ? 0 : 2);
  const format = (n: number) => (kind === "money" ? Math.round(n).toLocaleString("en-US") : String(Number(n.toFixed(places))));
  const unit = suffix ?? (kind === "percent" ? "%" : kind === "years" ? "yrs" : undefined);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={fid}>{label}</Label>
      <div className="relative">
        {kind === "money" && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">$</span>
        )}
        <Input
          id={fid}
          inputMode={kind === "money" ? "numeric" : "decimal"}
          autoComplete="off"
          className={cn("tabular-nums", kind === "money" && "pl-7", unit && "pr-12")}
          value={draft ?? format(value)}
          aria-describedby={help ? `${fid}-help` : undefined}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const cleaned = raw.replace(/[^\d.-]/g, "");
            if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned.endsWith("-")) return;
            const n = Number(cleaned);
            if (Number.isFinite(n)) onChange(clamp(n, min, max));
          }}
          onBlur={() => setDraft(null)}
        />
        {unit && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
      {help && <p id={`${fid}-help`} className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

/** Headline result: label, big value, optional sub-line. */
export function ResultStat({ label, value, sub, tone = "default", className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "default" | "primary"; className?: string }) {
  return (
    <div className={cn("rounded-2xl border p-4", tone === "primary" ? "border-primary/30 bg-primary/5" : "bg-card", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
