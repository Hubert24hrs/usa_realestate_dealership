"use client";

import { useMemo, useState } from "react";
import { Bike, Bus, Car, Footprints } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { haversineMiles } from "@/lib/geo";
import { cn } from "@/lib/utils";

export interface Destination {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

const MODES = [
  { id: "drive", label: "Drive", icon: Car, mph: 27, overhead: 4 },
  { id: "transit", label: "Transit", icon: Bus, mph: 14, overhead: 10 },
  { id: "bike", label: "Bike", icon: Bike, mph: 10, overhead: 2 },
  { id: "walk", label: "Walk", icon: Footprints, mph: 3, overhead: 0 },
] as const;

/** Estimated door-to-door commute (road factor 1.3 + mode overhead). Demo estimate, not live traffic. */
export function CommuteCalculator({ origin, destinations }: { origin: { lat: number; lng: number }; destinations: Destination[] }) {
  const [destId, setDestId] = useState(destinations[0]?.id ?? "");
  const dest = destinations.find((d) => d.id === destId);
  const results = useMemo(() => {
    if (!dest) return [];
    const miles = haversineMiles(origin, dest) * 1.3;
    return MODES.map((m) => ({ ...m, miles, minutes: Math.max(1, Math.round((miles / m.mph) * 60 + m.overhead)) }));
  }, [dest, origin]);
  if (!destinations.length) return null;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="commute-dest">Commute to</Label>
        <Select value={destId} onValueChange={setDestId}>
          <SelectTrigger id="commute-dest" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{destinations.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-live="polite">
        {results.map((r) => (
          <li key={r.id} className={cn("rounded-xl border p-3 text-center")}>
            <r.icon className="mx-auto size-5 text-muted-foreground" aria-hidden />
            <p className="mt-1 text-lg font-semibold">{r.minutes} min</p>
            <p className="text-xs text-muted-foreground">{r.label} · {r.miles.toFixed(1)} mi</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Estimate for typical conditions based on straight line distance. Not live traffic or transit schedules.</p>
    </div>
  );
}
