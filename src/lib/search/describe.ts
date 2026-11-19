import { PROPERTY_TYPE_LABELS, type PropertyTypeKey, type SearchMode } from "@/lib/domain";
import type { SearchFilters } from "./filters";

export interface FilterChip {
  /** Filter key(s) to clear when the chip is removed. */
  keys: Array<keyof SearchFilters>;
  label: string;
}

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace(/0$/, "").replace(/\.$/, "")}M`;
  if (n >= 10_000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

function rangeLabel(r: { min?: number; max?: number }, fmt: (n: number) => string, unit = ""): string {
  if (r.min != null && r.max != null) return `${fmt(r.min)} to ${fmt(r.max)}${unit}`;
  if (r.max != null) return `Under ${fmt(r.max)}${unit}`;
  return `${fmt(r.min!)}+${unit}`;
}

/** Human-readable chips for every active filter (used by NL search and the results header). */
export function describeFilters(f: Partial<SearchFilters>, mode: SearchMode = f.mode ?? "buy"): FilterChip[] {
  const chips: FilterChip[] = [];
  const push = (keys: Array<keyof SearchFilters>, label: string) => chips.push({ keys, label });
  if (f.price && (f.price.min != null || f.price.max != null)) push(["price"], rangeLabel(f.price, money, mode === "rent" ? "/mo" : ""));
  if (f.bedsMin) push(["bedsMin"], `${f.bedsMin}+ beds`);
  if (f.bathsMin) push(["bathsMin"], `${f.bathsMin}+ baths`);
  if (f.homeTypes?.length) push(["homeTypes"], f.homeTypes.map((t) => PROPERTY_TYPE_LABELS[t as PropertyTypeKey] ?? t).join(", "));
  if (f.sqft && (f.sqft.min != null || f.sqft.max != null)) push(["sqft"], rangeLabel(f.sqft, (n) => n.toLocaleString("en-US"), " sqft"));
  if (f.lotSqft && (f.lotSqft.min != null || f.lotSqft.max != null)) push(["lotSqft"], rangeLabel(f.lotSqft, (n) => (n >= 43560 ? `${(n / 43560).toFixed(1).replace(/\.0$/, "")} ac` : `${n.toLocaleString("en-US")} sqft`), " lot"));
  if (f.acres && (f.acres.min != null || f.acres.max != null)) push(["acres"], rangeLabel(f.acres, (n) => String(n), " acres"));
  if (f.yearBuilt && (f.yearBuilt.min != null || f.yearBuilt.max != null)) push(["yearBuilt"], f.yearBuilt.min != null && f.yearBuilt.max == null ? `Built ${f.yearBuilt.min}+` : f.yearBuilt.max != null && f.yearBuilt.min == null ? `Built before ${f.yearBuilt.max}` : `Built ${f.yearBuilt.min} to ${f.yearBuilt.max}`);
  if (f.hoaMax != null) push(["hoaMax"], f.hoaMax === 0 ? "No HOA" : `HOA ≤ ${money(f.hoaMax)}/mo`);
  if (f.garageMin) push(["garageMin"], `${f.garageMin}+ garage`);
  if (f.singleStory) push(["singleStory"], "Single story");
  if (f.pool) push(["pool"], "Pool");
  if (f.yard) push(["yard"], "Yard");
  if (f.waterfront) push(["waterfront"], "Waterfront");
  if (f.view) push(["view"], "View");
  if (f.basement) push(["basement"], "Basement");
  if (f.parking) push(["parking"], "Parking");
  if (f.pets) push(["pets"], f.pets === "dogs" ? "Dog friendly" : f.pets === "cats" ? "Cat friendly" : "Pet friendly");
  if (f.keywords) push(["keywords"], `“${f.keywords}”`);
  if (f.daysOnMarketMax) push(["daysOnMarketMax"], `Listed ≤ ${f.daysOnMarketMax} days`);
  if (f.openHouse) push(["openHouse"], "Open house");
  if (f.foreclosure) push(["foreclosure"], "Foreclosure");
  if (f.fsbo) push(["fsbo"], "By owner");
  if (f.comingSoon === true) push(["comingSoon"], "Coming soon only");
  if (f.comingSoon === false) push(["comingSoon"], "No coming soon");
  if (f.newConstruction && mode !== "new") push(["newConstruction"], "New construction");
  if (f.tour3d) push(["tour3d"], "3D tour");
  if (f.video) push(["video"], "Video");
  if (f.priceReduced) push(["priceReduced"], "Price reduced");
  if (f.includePending) push(["includePending"], "Incl. pending");
  if (f.luxury) push(["luxury"], "Luxury");
  if (f.schoolRatingMin) push(["schoolRatingMin"], `Schools ${f.schoolRatingMin}+/10`);
  if (f.school) push(["school"], "Near selected school");
  if (f.soldWithinDays) push(["soldWithinDays"], `Sold ≤ ${f.soldWithinDays} days`);
  if (f.transaction) push(["transaction"], f.transaction === "lease" ? "For lease" : "For sale");
  if (f.capRateMin != null) push(["capRateMin"], `Cap rate ≥ ${f.capRateMin}%`);
  if (f.landTypes?.length) push(["landTypes"], f.landTypes.join(", "));
  if (f.activities?.length) push(["activities"], f.activities.join(", "));
  if (f.water) push(["water"], "Water on property");
  if (f.polygon) push(["polygon"], "Drawn area");
  else if (f.bounds) push(["bounds"], "Map area");
  return chips;
}
