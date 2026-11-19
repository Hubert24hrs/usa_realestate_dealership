import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export interface RateRow {
  product: string;
  slug: string;
  rate: number;
  apr: number;
  points: number;
  date: string;
  /** Change vs. the prior week, in percentage points. */
  change: number | null;
}

export interface RateHistory {
  slug: string;
  product: string;
  points: Array<{ date: string; rate: number }>;
}

const ORDER = ["30-year-fixed", "15-year-fixed", "5-1-arm", "30-year-fha", "30-year-va", "30-year-jumbo"];
const rank = (slug: string) => (ORDER.indexOf(slug) + 1 || 99);

/** Latest sample rate per product plus its weekly history (demo data, refreshed hourly). */
export const getRates = unstable_cache(
  async () => {
    const rows = await db.mortgageRate.findMany({ orderBy: [{ slug: "asc" }, { date: "asc" }] });
    const bySlug = new Map<string, typeof rows>();
    for (const r of rows) bySlug.set(r.slug, [...(bySlug.get(r.slug) ?? []), r]);
    const latest: RateRow[] = [];
    const history: RateHistory[] = [];
    for (const slug of [...bySlug.keys()].sort((a, b) => rank(a) - rank(b))) {
      const list = bySlug.get(slug)!;
      const last = list[list.length - 1]!;
      const prev = list[list.length - 2];
      latest.push({ product: last.product, slug, rate: last.rate, apr: last.apr, points: last.points, date: last.date.toISOString(), change: prev ? Number((last.rate - prev.rate).toFixed(3)) : null });
      history.push({ slug, product: last.product, points: list.map((r) => ({ date: r.date.toISOString(), rate: r.rate })) });
    }
    return { latest, history, asOf: latest[0]?.date ?? null };
  },
  ["mortgage-rates-v1"],
  { revalidate: 3600, tags: ["rates"] },
);

/** Today's sample 30-year fixed rate (falls back to a sensible default). */
export async function defaultRate(): Promise<number> {
  const { latest } = await getRates();
  return latest.find((r) => r.slug === "30-year-fixed")?.rate ?? 6.5;
}
