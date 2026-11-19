"use client";

import { useMemo, useState } from "react";
import Link from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { formatBaths, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface UnitRow {
  id: string;
  unitNumber: string;
  floorPlan: string;
  beds: number;
  baths: number;
  sqft: number;
  rent: number;
  deposit: number | null;
  availableDate: string | null;
  isAvailable: boolean;
  floor: number | null;
  features: string[];
}

export function RentalUnits({ units, applyBase }: { units: UnitRow[]; applyBase: string }) {
  const bedOptions = useMemo(() => [...new Set(units.map((u) => u.beds))].sort((a, b) => a - b), [units]);
  const [beds, setBeds] = useState<number | "all">("all");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const rows = units.filter((u) => (beds === "all" || u.beds === beds) && (!onlyAvailable || u.isAvailable));
  const today = new Date();
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter by bedrooms" className="flex flex-wrap gap-1.5">
          {(["all", ...bedOptions] as const).map((b) => (
            <button key={String(b)} type="button" aria-pressed={beds === b} onClick={() => setBeds(b)} className={cn("rounded-full border px-3 py-1 text-sm font-medium", beds === b ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>
              {b === "all" ? "All" : b === 0 ? "Studio" : `${b} bd`}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} /> Available only
        </label>
      </div>
      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[680px] text-sm">
          <caption className="sr-only">Available units and pricing</caption>
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              {["Unit", "Floor plan", "Beds / baths", "Sq ft", "Rent", "Deposit", "Available", ""].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No units match. Try another floor plan.</td></tr>
            ) : (
              rows.map((u) => {
                const avail = u.availableDate ? new Date(u.availableDate) : null;
                return (
                  <tr key={u.id} className="border-t">
                    <th scope="row" className="px-3 py-2.5 text-left font-semibold">#{u.unitNumber}</th>
                    <td className="px-3 py-2.5">{u.floorPlan}<span className="block text-xs text-muted-foreground">{u.features.join(" · ")}</span></td>
                    <td className="px-3 py-2.5">{u.beds === 0 ? "Studio" : `${u.beds} bd`} · {formatBaths(u.baths)} ba</td>
                    <td className="px-3 py-2.5">{formatNumber(u.sqft)}</td>
                    <td className="px-3 py-2.5 font-semibold">${u.rent.toLocaleString("en-US")}</td>
                    <td className="px-3 py-2.5">{u.deposit ? `$${u.deposit.toLocaleString("en-US")}` : "N/A"}</td>
                    <td className="px-3 py-2.5">{!u.isAvailable ? "Leased" : !avail || avail <= today ? "Now" : avail.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className="px-3 py-2.5 text-right">
                      {u.isAvailable && <Button asChild size="sm"><Link href={`${applyBase}?unit=${u.id}`}>Apply</Link></Button>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
