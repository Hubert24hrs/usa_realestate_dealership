import { GraduationCap } from "lucide-react";
import { formatDate, formatMoney, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EqualHousingStatement } from "@/components/compliance/equal-housing";
import { riskDescriptor, ScoreMeter } from "./score-meter";

export function Section({ id, title, subtitle, children, className }: { id: string; title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-28 border-t py-8 first:border-t-0", className)}>
      <h2 id={`${id}-title`} className="font-display text-[1.45rem] font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function FactGrid({ facts }: { facts: Array<[string, React.ReactNode | null | undefined]> }) {
  const shown = facts.filter(([, v]) => v != null && v !== "" && v !== false);
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      {shown.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FeatureList({ groups }: { groups: Array<[string, string[]]> }) {
  const shown = groups.filter(([, items]) => items.length);
  if (!shown.length) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {shown.map(([title, items]) => (
        <div key={title}>
          <h3 className="mb-2 text-sm font-semibold">{title}</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {items.map((i) => <li key={i} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-copper-500" aria-hidden />{i}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function PriceHistoryTable({ rows }: { rows: Array<{ id: string; date: Date; event: string; price: number; source: string | null }> }) {
  const label: Record<string, string> = { LISTED: "Listed for sale", PRICE_CHANGE: "Price change", PENDING: "Pending sale", SOLD: "Sold", DELISTED: "Delisted", RELISTED: "Relisted", RENTED: "Rented" };
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[480px] text-sm">
        <caption className="sr-only">Price history</caption>
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>{["Date", "Event", "Price", "Change", "Source"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r, i) => {
            const prev = rows[i + 1];
            const change = prev && prev.price ? (r.price - prev.price) / prev.price : null;
            return (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{formatDate(r.date)}</td>
                <td className="px-3 py-2">{label[r.event] ?? r.event}</td>
                <td className="px-3 py-2 font-medium">{formatPrice(r.price)}</td>
                <td className={cn("px-3 py-2", change && change < 0 ? "text-success" : "text-muted-foreground")}>{change ? `${change > 0 ? "+" : ""}${(change * 100).toFixed(1)}%` : ""}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.source ?? "N/A"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TaxHistoryTable({ rows }: { rows: Array<{ id: string; year: number; taxPaid: number; assessedValue: number; landValue: number | null; improvementValue: number | null }> }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[480px] text-sm">
        <caption className="sr-only">Tax history</caption>
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>{["Year", "Property tax", "Assessed value", "Land", "Improvements"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2">{r.year}</td>
              <td className="px-3 py-2 font-medium">{formatPrice(r.taxPaid)}</td>
              <td className="px-3 py-2">{formatPrice(r.assessedValue)}</td>
              <td className="px-3 py-2">{formatPrice(r.landValue)}</td>
              <td className="px-3 py-2">{formatPrice(r.improvementValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EstimatePanel({ estimate, low, high, listPrice, rentEstimate }: { estimate: number; low: number; high: number; listPrice: number; rentEstimate: number | null }) {
  const span = high - low || 1;
  const markerPct = Math.max(0, Math.min(100, ((listPrice - low) / span) * 100));
  return (
    <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border bg-surface p-5">
        <p className="text-sm text-muted-foreground">CITI VIEW Estimate</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{formatPrice(estimate)}</p>
        <div className="mt-4">
          <div className="relative h-2 rounded-full bg-primary/15">
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary/50" style={{ width: "100%" }} />
            <span className="absolute -top-1.5 size-5 -translate-x-1/2 rounded-full border-2 border-card bg-copper-500" style={{ left: `${markerPct}%` }} aria-hidden />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Low {formatPrice(low)}</span>
            <span>High {formatPrice(high)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground"><span className="mr-1 inline-block size-2.5 rounded-full bg-copper-500 align-middle" aria-hidden />List price {formatPrice(listPrice)} sits {listPrice > estimate ? "above" : listPrice < estimate ? "below" : "at"} the estimate.</p>
        </div>
      </div>
      <div className="rounded-2xl border p-5">
        <p className="text-sm text-muted-foreground">Rent estimate</p>
        <p className="mt-1 text-2xl font-semibold">{rentEstimate ? `${formatMoney(rentEstimate)}/mo` : "N/A"}</p>
        <p className="mt-3 text-xs text-muted-foreground">Estimated from recent nearby sales, list prices and home features. Not an appraisal.</p>
      </div>
    </div>
  );
}

export function SchoolList({ schools }: { schools: Array<{ id: string; name: string; rating: number; level: string; type: string; grades: string; distanceMiles: number; isAssigned: boolean; district: string | null }> }) {
  if (!schools.length) return <p className="text-sm text-muted-foreground">No nearby schools on record.</p>;
  const band = (r: number) => (r >= 8 ? "Above average" : r >= 5 ? "Average" : "Below average");
  return (
    <ul className="divide-y rounded-2xl border">
      {schools.map((s) => (
        <li key={s.id} className="flex items-center gap-4 p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-primary/30 text-lg font-semibold text-primary" aria-label={`Rating ${s.rating} out of 10`}>
            {s.rating}<span className="sr-only">/10</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">
              {s.type === "PUBLIC" ? "Public" : s.type === "CHARTER" ? "Charter" : "Private"} · {s.grades} · {s.distanceMiles.toFixed(1)} mi{s.district ? ` · ${s.district}` : ""}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-medium">{band(s.rating)}</p>
            {s.isAssigned && <p className="mt-0.5 inline-flex items-center gap-1 text-muted-foreground"><GraduationCap className="size-3.5" aria-hidden /> Assigned</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RiskPanel({ risks }: { risks: { flood: number | null; fire: number | null; heat: number | null; wind: number | null; air: number | null; crime: number | null; noise: number | null } }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <ScoreMeter label="Flood risk" value={risks.flood} max={10} tone="risk" descriptor={riskDescriptor(risks.flood)} />
      <ScoreMeter label="Wildfire risk" value={risks.fire} max={10} tone="risk" descriptor={riskDescriptor(risks.fire)} />
      <ScoreMeter label="Heat risk" value={risks.heat} max={10} tone="risk" descriptor={riskDescriptor(risks.heat)} />
      <ScoreMeter label="Wind risk" value={risks.wind} max={10} tone="risk" descriptor={riskDescriptor(risks.wind)} />
      <ScoreMeter label="Air quality concern" value={risks.air} max={10} tone="risk" descriptor={riskDescriptor(risks.air)} />
      <ScoreMeter label="Ambient noise" value={risks.noise} max={100} tone="risk" descriptor={riskDescriptor(risks.noise, 100)} />
      <ScoreMeter label="Reported crime (relative)" value={risks.crime} max={100} tone="risk" descriptor={riskDescriptor(risks.crime, 100)} />
      <p className="text-xs text-muted-foreground sm:col-span-2">Environmental and crime figures are illustrative. Check FEMA flood maps, local fire authorities and official crime statistics before deciding. Perceptions of neighborhood safety can reflect bias. Consider the data, not reputations.</p>
    </div>
  );
}

export function ListingDisclaimers({ listingDisclaimer, idxDisclaimer, fairHousing, attribution, mlsNumber, updatedAt }: { listingDisclaimer: string; idxDisclaimer: string; fairHousing: string; attribution: string; mlsNumber: string | null; updatedAt: Date }) {
  return (
    <section aria-label="Disclaimers" className="space-y-3 border-t pt-6 text-xs leading-relaxed text-muted-foreground">
      <p><strong className="font-semibold text-foreground">{attribution}</strong>{mlsNumber ? ` · MLS# ${mlsNumber}` : ""} · Last updated {formatDate(updatedAt)}</p>
      <p>{listingDisclaimer}</p>
      <p><strong className="font-semibold text-foreground">IDX disclaimer.</strong> {idxDisclaimer}</p>
      <EqualHousingStatement text={fairHousing} />
    </section>
  );
}
