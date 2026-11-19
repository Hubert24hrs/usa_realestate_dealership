import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export const COL_CATEGORIES = ["housing", "groceries", "transportation", "utilities", "healthcare", "childcare"] as const;
export type ColCategory = (typeof COL_CATEGORIES)[number];

export interface CityMarket {
  slug: string;
  name: string;
  stateCode: string;
  isRural: boolean;
  population: number | null;
  medianRent: number;
  medianHomeValue: number;
  medianPpsf: number;
  medianDom: number;
  /** Overall cost-of-living index (U.S. average = 100). */
  colIndex: number;
  col: Record<ColCategory, number>;
  months: Array<{ label: string; rent: number; list: number }>;
  rentYoY: number | null;
  rent3m: number | null;
}

/** Month label that is stable whatever timezone the data was seeded in. */
export const monthLabel = (d: Date) => new Date(d.getTime() + 12 * 3_600_000).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

const change = (series: number[], back: number) => (series.length > back && series[series.length - 1 - back] ? series[series.length - 1]! / series[series.length - 1 - back]! - 1 : null);

/** Every market with its rent history and cost-of-living profile (demo data, cached for an hour). */
export const getCityMarkets = unstable_cache(
  async (): Promise<CityMarket[]> => {
    const cities = await db.city.findMany({
      orderBy: [{ population: "desc" }, { name: "asc" }],
      select: { slug: true, name: true, stateCode: true, isRural: true, population: true, medianRent: true, medianHomeValue: true, costOfLivingIndex: true, costOfLiving: true, marketStats: { orderBy: { month: "asc" }, select: { month: true, medianRent: true, medianListPrice: true, medianPricePerSqft: true, medianDaysOnMarket: true } } },
    });
    return cities.map((c) => {
      const raw = (c.costOfLiving ?? {}) as Partial<Record<ColCategory, number>>;
      const col = Object.fromEntries(COL_CATEGORIES.map((k) => [k, Number(raw[k]) || 100])) as Record<ColCategory, number>;
      const rents = c.marketStats.map((m) => m.medianRent);
      return {
        slug: c.slug,
        name: c.name,
        stateCode: c.stateCode,
        isRural: c.isRural,
        population: c.population,
        medianRent: rents[rents.length - 1] ?? c.medianRent ?? 0,
        medianHomeValue: c.medianHomeValue ?? c.marketStats[c.marketStats.length - 1]?.medianListPrice ?? 0,
        medianPpsf: c.marketStats[c.marketStats.length - 1]?.medianPricePerSqft ?? 0,
        medianDom: c.marketStats[c.marketStats.length - 1]?.medianDaysOnMarket ?? 0,
        colIndex: c.costOfLivingIndex ?? 100,
        col,
        months: c.marketStats.map((m) => ({ label: monthLabel(m.month), rent: m.medianRent, list: m.medianListPrice })),
        rentYoY: change(rents, 12),
        rent3m: change(rents, 3),
      };
    });
  },
  ["city-markets-v2"],
  { revalidate: 3600, tags: ["markets"] },
);
