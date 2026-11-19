/**
 * Comparable-sales automated valuation (pure, unit-testable).
 * 1. Keep comps of the same home style and a similar size.
 * 2. Adjust each comp's price toward the subject (size, beds, baths, age, pool, garage, time, list-to-sale).
 * 3. Weight comps by similarity (size, layout, age, location, recency, sold > listed) and take the weighted median.
 * 4. Blend with the city's median $/sq ft when comps are thin; widen the range as similarity and agreement drop.
 */

export type Condition = "needs-work" | "average" | "updated" | "renovated";
export const CONDITION_FACTOR: Record<Condition, number> = { "needs-work": -0.1, average: 0, updated: 0.05, renovated: 0.1 };

export interface Subject {
  propertyType: string;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt?: number | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  hasPool?: boolean;
  garageSpaces?: number;
  condition: Condition;
}

export interface Comp {
  id: string;
  slug: string;
  address: string;
  status: string;
  price: number;
  /** Sold date for sold comps, list date otherwise. */
  date: Date;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number | null;
  propertyType: string;
  zip: string;
  lat: number;
  lng: number;
  hasPool: boolean;
  garageSpaces: number;
  photo?: { url: string; alt: string; blurDataUrl: string | null } | null;
}

export interface Adjustment {
  label: string;
  amount: number;
}

export interface CompResult {
  comp: Comp;
  distanceMi: number | null;
  similarity: number;
  adjustedValue: number;
  adjustments: Adjustment[];
}

export interface Valuation {
  value: number;
  low: number;
  high: number;
  confidence: "high" | "medium" | "low";
  pricePerSqft: number;
  comps: CompResult[];
  compsUsed: number;
  marketWeight: number;
}

const GROUP: Record<string, string> = { SINGLE_FAMILY: "house", MANUFACTURED: "house", FARM_RANCH: "house", TOWNHOUSE: "attached", CONDO: "attached", MULTI_FAMILY: "multi" };
const groupOf = (t: string) => GROUP[t] ?? "house";

export function haversineMi(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function weightedMedian(values: Array<{ v: number; w: number }>) {
  const sorted = [...values].sort((a, b) => a.v - b.v);
  const total = sorted.reduce((s, x) => s + x.w, 0);
  let acc = 0;
  for (const x of sorted) {
    acc += x.w;
    if (acc >= total / 2) return x.v;
  }
  return sorted[sorted.length - 1]?.v ?? 0;
}

const roundTo = (n: number) => (n >= 1_000_000 ? Math.round(n / 5_000) * 5_000 : Math.round(n / 1_000) * 1_000);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};

export function valueHome(subject: Subject, candidates: Comp[], marketPpsf: number, now = new Date()): Valuation | null {
  if (subject.sqft <= 0) return null;
  const group = groupOf(subject.propertyType);
  const pool = candidates.filter((c) => c.price > 0 && c.sqft > 0 && groupOf(c.propertyType) === group && c.sqft >= subject.sqft * 0.5 && c.sqft <= subject.sqft * 2);
  const localPpsf = median(pool.map((c) => c.price / c.sqft)) || marketPpsf;
  const ppsf = localPpsf || marketPpsf || 250;

  const results: CompResult[] = pool.map((c) => {
    const adj: Adjustment[] = [];
    const add = (label: string, amount: number) => {
      if (Math.abs(amount) >= 500) adj.push({ label, amount: Math.round(amount) });
    };
    // Size at ~45% of local $/sq ft: extra space is worth less than the average square foot.
    add("Size", (subject.sqft - c.sqft) * ppsf * 0.45);
    add("Bedrooms", Math.max(-3, Math.min(3, subject.beds - c.beds)) * c.price * 0.015);
    add("Bathrooms", Math.max(-3, Math.min(3, subject.baths - c.baths)) * c.price * 0.02);
    if (subject.yearBuilt && c.yearBuilt) add("Age", Math.max(-40, Math.min(40, subject.yearBuilt - c.yearBuilt)) * c.price * 0.0015);
    if (subject.hasPool !== undefined) add("Pool", (Number(subject.hasPool) - Number(c.hasPool)) * c.price * 0.025);
    if (subject.garageSpaces !== undefined) add("Garage", Math.max(-3, Math.min(3, subject.garageSpaces - c.garageSpaces)) * 8_000);
    const months = Math.max(0, (now.getTime() - c.date.getTime()) / (30.44 * 86_400_000));
    if (c.status === "SOLD") add("Market change since sale", c.price * 0.003 * Math.min(18, months));
    else add("List to sale", -c.price * 0.02);
    const base = c.price + adj.reduce((s, a) => s + a.amount, 0);
    const conditionAmt = base * CONDITION_FACTOR[subject.condition];
    if (Math.abs(conditionAmt) >= 500) adj.push({ label: "Condition", amount: Math.round(conditionAmt) });
    const adjustedValue = base + conditionAmt;

    const distanceMi = subject.lat != null && subject.lng != null ? haversineMi(subject.lat, subject.lng, c.lat, c.lng) : null;
    const sizeGap = Math.abs(subject.sqft - c.sqft) / subject.sqft;
    let sim = 1;
    sim *= Math.exp(-2.2 * sizeGap);
    sim *= Math.exp(-0.25 * Math.abs(subject.beds - c.beds)) * Math.exp(-0.25 * Math.abs(subject.baths - c.baths));
    if (subject.yearBuilt && c.yearBuilt) sim *= Math.exp(-Math.abs(subject.yearBuilt - c.yearBuilt) / 60);
    if (distanceMi != null) sim *= Math.exp(-distanceMi / 6);
    else if (subject.zip) sim *= subject.zip === c.zip ? 1 : 0.6;
    sim *= c.status === "SOLD" ? Math.exp(-months / 18) : 0.75;
    // Comps that need big adjustments are less reliable.
    sim *= Math.exp(-Math.abs(adjustedValue - c.price) / c.price);
    return { comp: c, distanceMi, similarity: Math.max(0.001, Math.min(1, sim)), adjustedValue, adjustments: adj };
  });

  results.sort((a, b) => b.similarity - a.similarity);
  const used = results.slice(0, 8);
  const marketValue = ppsf * subject.sqft * (1 + CONDITION_FACTOR[subject.condition]);
  if (!used.length && !marketPpsf) return null;

  const compValue = used.length ? weightedMedian(used.map((r) => ({ v: r.adjustedValue, w: r.similarity }))) : marketValue;
  const strength = used.reduce((s, r) => s + r.similarity, 0);
  const marketWeight = Math.max(0.1, 1 - Math.min(1, strength / 2.5));
  const value = compValue * (1 - marketWeight) + marketValue * marketWeight;

  // Spread: weighted deviation of the comps around the estimate, widened when evidence is weak.
  const dev = used.length ? used.reduce((s, r) => s + r.similarity * Math.abs(r.adjustedValue - value), 0) / Math.max(1e-9, strength) / value : 0.15;
  const spread = Math.min(0.2, Math.max(0.04, dev * 1.2 + marketWeight * 0.08));
  const confidence = used.length >= 5 && spread <= 0.08 ? "high" : used.length >= 3 && spread <= 0.13 ? "medium" : "low";

  return {
    value: roundTo(value),
    low: roundTo(value * (1 - spread)),
    high: roundTo(value * (1 + spread)),
    confidence,
    pricePerSqft: Math.round(value / subject.sqft),
    comps: used.slice(0, 6),
    compsUsed: used.length,
    marketWeight,
  };
}
