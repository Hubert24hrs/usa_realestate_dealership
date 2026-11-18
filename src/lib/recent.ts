/** Recently viewed listings for anonymous visitors (localStorage; signed-in users also sync to the DB). */
export interface RecentEntry {
  id: string;
  citySlug: string | null;
  price: number;
  beds: number | null;
  mode: "buy" | "rent" | "commercial" | "land" | "sold" | "new";
  ts: number;
}

const KEY = "cv_recent_v1";
const MAX = 20;

export function readRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

export function pushRecent(entry: Omit<RecentEntry, "ts">) {
  try {
    const list = readRecent().filter((e) => e.id !== entry.id);
    list.unshift({ ...entry, ts: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}

/** Derive a "homes for you" query from browsing history: most-viewed city, typical price ±30%, typical beds. */
export function preferenceFromRecent(list: RecentEntry[]): { citySlug: string; mode: RecentEntry["mode"]; priceMax: number; priceMin: number; bedsMin?: number } | null {
  const forSale = list.filter((e) => e.citySlug);
  if (!forSale.length) return null;
  const counts = new Map<string, number>();
  for (const e of forSale) counts.set(e.citySlug!, (counts.get(e.citySlug!) ?? 0) + 1);
  const citySlug = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  const inCity = forSale.filter((e) => e.citySlug === citySlug);
  const mode = inCity[0]!.mode;
  const prices = inCity.map((e) => e.price).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)]!;
  const beds = inCity.map((e) => e.beds ?? 0).sort((a, b) => a - b);
  const typicalBeds = beds[Math.floor(beds.length / 2)] ?? 0;
  return { citySlug, mode, priceMin: Math.round(median * 0.7), priceMax: Math.round(median * 1.3), bedsMin: typicalBeds > 1 ? typicalBeds - 1 : undefined };
}
