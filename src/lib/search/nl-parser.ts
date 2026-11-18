/**
 * Natural-language search → structured filters (rule-based, deterministic).
 * "3 bed under $600k near good schools with a yard in Austin"
 *   → { bedsMin: 3, price.max: 600000, schoolRatingMin: 7, yard: true }, placeQuery "austin"
 *
 * Fair Housing: preferences tied to protected characteristics (race, religion,
 * national origin, familial status, sex, disability…) are never turned into
 * filters; they're removed and reported as a notice.
 */
import type { SearchMode } from "@/lib/domain";
import type { SearchFilters } from "./filters";

export interface NlChip {
  key: string;
  label: string;
}

export interface NlParseResult {
  mode: SearchMode;
  filters: Partial<SearchFilters>;
  chips: NlChip[];
  placeQuery?: string;
  notices: string[];
}

const WORD_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

const PROTECTED =
  /\b(no (?:kids|children)|adults? only|childless|families with (?:kids|children)|family[- ]friendly neighborhood|(?:white|black|hispanic|latino|latina|asian|arab|jewish|christian|muslim|catholic|hindu|mormon|gay|lesbian|straight|immigrant|foreigner)s? (?:neighborhood|area|community|people|owners|only)|near (?:a )?(?:church|mosque|synagogue|temple)|english[- ]speaking|(?:male|female|men|women)[- ]only|no (?:section 8|vouchers)|race|ethnic(?:ity)?|religio(?:n|us))\b/gi;

function money(raw: string, unit?: string): number | undefined {
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return undefined;
  const u = (unit ?? "").toLowerCase();
  if (u === "k" || u === "thousand") return Math.round(value * 1_000);
  if (u === "m" || u === "mm" || u === "mil" || u === "million") return Math.round(value * 1_000_000);
  return Math.round(value);
}

const MONEY = String.raw`\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|m|mm|mil|million|thousand)?\b`;

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace(/0$/, "")}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

export function parseNaturalLanguage(input: string, defaultMode: SearchMode = "buy"): NlParseResult {
  const notices: string[] = [];
  const chips: NlChip[] = [];
  const f: Partial<SearchFilters> = {};
  let text = ` ${input.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim()} `;

  // 0. Fair Housing guard (reset lastIndex: the regex is global and shared across calls)
  PROTECTED.lastIndex = 0;
  if (PROTECTED.test(text)) {
    notices.push("We don't filter by characteristics protected under the Fair Housing Act, so part of your request was ignored. Results are based on the home's features, price and location.");
    text = text.replace(PROTECTED, " ").replace(/\s+/g, " ");
  }
  if (/\b(safe|safest|low[- ]crime)\b/.test(text)) {
    notices.push("Safety isn't a search filter. Turn on the crime map layer to review demo crime data for any area.");
    text = text.replace(/\b(safe|safest|low[- ]crime)\b/g, " ");
  }

  // 1. Mode
  let mode: SearchMode = defaultMode;
  const has = (re: RegExp) => re.test(text);
  if (has(/\b(for rent|to rent|rentals?|renting|lease an? apartment|apartments?|per month|\/mo\b|a month|monthly)\b/)) mode = "rent";
  if (has(/\b(sold|recently sold|sale history)\b/)) mode = "sold";
  if (has(/\b(new construction|new[- ]build|newly built|brand new|builder)\b/)) mode = "new";
  if (has(/\b(office space|retail space|storefront|warehouse|industrial|commercial|cap rate|investment property|nnn|mixed[- ]use)\b/)) mode = "commercial";
  if (has(/\b(\d+(?:\.\d+)?\+?\s*acres?|acreage|ranch(?:es)?|farm(?:land)?s?|timber(?:land)?|hunting land|raw land|land for sale|homesite|buildable lot)\b/) && mode !== "commercial") mode = "land";
  if (mode !== defaultMode) chips.push({ key: "mode", label: { buy: "For sale", rent: "For rent", sold: "Sold", new: "New construction", commercial: "Commercial", land: "Land" }[mode] });

  // 2. Beds / baths
  const bedRe = /\b(\d|one|two|three|four|five|six)\s*\+?\s*(?:-\s*)?(?:bed(?:room)?s?|bd|br)\b/;
  const bed = text.match(bedRe);
  if (bed) {
    f.bedsMin = WORD_NUMBERS[bed[1]!] ?? Number(bed[1]);
    chips.push({ key: "bedsMin", label: `${f.bedsMin}+ beds` });
    text = text.replace(bedRe, " ");
  } else if (/\bstudio\b/.test(text)) {
    chips.push({ key: "studio", label: "Studios OK" });
  }
  const bathRe = /\b(\d(?:\.5)?|one|two|three|four)\s*\+?\s*(?:-\s*)?(?:bath(?:room)?s?|ba)\b/;
  const bath = text.match(bathRe);
  if (bath) {
    f.bathsMin = WORD_NUMBERS[bath[1]!] ?? Number(bath[1]);
    chips.push({ key: "bathsMin", label: `${f.bathsMin}+ baths` });
    text = text.replace(bathRe, " ");
  }

  // 3. HOA, square feet, acres (before generic price so their numbers aren't read as prices)
  if (/\bno hoa\b/.test(text)) {
    f.hoaMax = 0;
    chips.push({ key: "hoaMax", label: "No HOA" });
    text = text.replace(/\bno hoa\b/g, " ");
  }
  const hoa = text.match(new RegExp(String.raw`\bhoa (?:under|below|less than|max|up to)\s*${MONEY}`));
  if (hoa) {
    f.hoaMax = money(hoa[1]!, hoa[2]);
    chips.push({ key: "hoaMax", label: `HOA ≤ ${fmt(f.hoaMax!)}/mo` });
    text = text.replace(hoa[0], " ");
  }
  const sqftRe = /\b(over|above|at least|more than|under|below|less than|max)?\s*(\d[\d,]*)\s*(?:\+\s*)?(?:sq\.? ?ft|sqft|square feet|sf)\b/;
  const sq = text.match(sqftRe);
  if (sq) {
    const n = Number(sq[2]!.replace(/,/g, ""));
    if (/under|below|less|max/.test(sq[1] ?? "")) f.sqft = { max: n };
    else f.sqft = { min: n };
    chips.push({ key: "sqft", label: f.sqft.max ? `≤ ${n.toLocaleString("en-US")} sqft` : `${n.toLocaleString("en-US")}+ sqft` });
    text = text.replace(sq[0], " ");
  }
  const acreRe = /\b(over|above|at least|more than|under|below|less than|up to)?\s*(\d+(?:\.\d+)?)\s*\+?\s*acres?\b/;
  const ac = text.match(acreRe);
  if (ac) {
    const n = Number(ac[2]);
    const isMax = /under|below|less|up to/.test(ac[1] ?? "");
    if (mode === "land") f.acres = isMax ? { max: n } : { min: n };
    else f.lotSqft = isMax ? { max: Math.round(n * 43560) } : { min: Math.round(n * 43560) };
    chips.push({ key: mode === "land" ? "acres" : "lotSqft", label: isMax ? `≤ ${n} acres` : `${n}+ acres` });
    text = text.replace(ac[0], " ");
  }
  const cap = text.match(/\bcap rate (?:over|above|of at least|at least|>)?\s*(\d+(?:\.\d+)?)\s*%?/);
  if (cap) {
    f.capRateMin = Number(cap[1]);
    chips.push({ key: "capRateMin", label: `Cap rate ≥ ${f.capRateMin}%` });
    text = text.replace(cap[0], " ");
  }

  // 4. Price
  const between = text.match(new RegExp(String.raw`\b(?:between|from)\s*${MONEY}\s*(?:and|to|-)\s*${MONEY}`));
  const dash = text.match(new RegExp(String.raw`\$\s*(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\s*(?:-|to)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\b`));
  const under = text.match(new RegExp(String.raw`\b(?:under|below|less than|max(?:imum)?|up to|no more than|budget(?: of)?|for)\s*${MONEY}`));
  const over = text.match(new RegExp(String.raw`\b(?:over|above|more than|at least|min(?:imum)?|starting at)\s*${MONEY}`));
  const around = text.match(new RegExp(String.raw`\b(?:around|about|roughly|~)\s*${MONEY}`));
  const plausible = (n: number | undefined) => n != null && (mode === "rent" ? n >= 300 : n >= 10_000);
  const range: { min?: number; max?: number } = {};
  if (between) {
    const a = money(between[1]!, between[2] ?? between[4]);
    const b = money(between[3]!, between[4]);
    if (plausible(a) && plausible(b)) Object.assign(range, { min: Math.min(a!, b!), max: Math.max(a!, b!) });
  } else if (dash) {
    const a = money(dash[1]!, dash[2] ?? dash[4]);
    const b = money(dash[3]!, dash[4]);
    if (plausible(a) && plausible(b)) Object.assign(range, { min: Math.min(a!, b!), max: Math.max(a!, b!) });
  } else {
    if (under) {
      const v = money(under[1]!, under[2]);
      if (plausible(v)) range.max = v;
    }
    if (over) {
      const v = money(over[1]!, over[2]);
      if (plausible(v)) range.min = v;
    }
    if (around && range.min == null && range.max == null) {
      const v = money(around[1]!, around[2]);
      if (plausible(v)) Object.assign(range, { min: Math.round(v! * 0.9), max: Math.round(v! * 1.1) });
    }
  }
  if (range.min != null || range.max != null) {
    f.price = range;
    const suffix = mode === "rent" ? "/mo" : "";
    chips.push({
      key: "price",
      label: range.min != null && range.max != null ? `${fmt(range.min)}–${fmt(range.max)}${suffix}` : range.max != null ? `Under ${fmt(range.max)}${suffix}` : `Over ${fmt(range.min!)}${suffix}`,
    });
  }

  // 5. Property types
  const types: string[] = [];
  const typeRules: Array<[RegExp, string, string]> = [
    [/\b(single[- ]family|houses?|detached)\b/, "SINGLE_FAMILY", "House"],
    [/\bcondos?\b|\bcondominiums?\b/, "CONDO", "Condo"],
    [/\b(town ?(?:house|home)s?|row ?houses?)\b/, "TOWNHOUSE", "Townhome"],
    [/\b(multi[- ]?family|duplex|triplex|fourplex|quadplex)\b/, "MULTI_FAMILY", "Multi-family"],
    [/\b(manufactured|mobile home)\b/, "MANUFACTURED", "Manufactured"],
    [/\boffice\b/, "OFFICE", "Office"],
    [/\b(retail|storefront|shop space)\b/, "RETAIL", "Retail"],
    [/\b(warehouse|industrial|flex space|distribution)\b/, "INDUSTRIAL", "Industrial"],
    [/\bmixed[- ]use\b/, "MIXED_USE", "Mixed use"],
  ];
  for (const [re, value, label] of typeRules) {
    if (re.test(text)) {
      if (mode === "rent" && value === "SINGLE_FAMILY" && /\bapartments?\b/.test(text)) continue;
      types.push(value);
      chips.push({ key: `type:${value}`, label });
    }
  }
  if (mode === "rent" && /\bapartments?\b/.test(text) && !types.length) {
    types.push("APARTMENT");
    chips.push({ key: "type:APARTMENT", label: "Apartment" });
  }
  if (types.length) f.homeTypes = types;

  // 6. Features
  const flag = (re: RegExp, key: keyof SearchFilters, label: string, value: unknown = true) => {
    if (re.test(text)) {
      (f as Record<string, unknown>)[key] = value;
      chips.push({ key, label });
    }
  };
  flag(/\b(pool|swimming)\b/, "pool", "Pool");
  flag(/\b(yard|backyard|garden|fenced)\b/, "yard", "Yard");
  flag(/\b(waterfront|lakefront|oceanfront|beachfront|on the water|riverfront)\b/, "waterfront", "Waterfront");
  flag(/\b(views?|skyline|mountain views?)\b/, "view", "View");
  flag(/\bbasement\b/, "basement", "Basement");
  flag(/\b(single[- ]story|one[- ]story|single[- ]level|ranch[- ]style)\b/, "singleStory", "Single story");
  flag(/\b(open houses?)\b/, "openHouse", "Open house");
  flag(/\b(foreclosures?|bank[- ]owned|reo)\b/, "foreclosure", "Foreclosure");
  flag(/\b(fsbo|by owner)\b/, "fsbo", "For sale by owner");
  flag(/\b(3d tour|virtual tour|matterport)\b/, "tour3d", "3D tour");
  flag(/\bvideo tour\b/, "video", "Video tour");
  flag(/\b(price (?:reduced|drop|cut)|reduced)\b/, "priceReduced", "Price reduced");
  flag(/\bluxury\b/, "luxury", "Luxury");
  flag(/\b(parking|carport)\b/, "parking", "Parking");
  const garage = text.match(/\b(\d)\s*[- ]?car garage\b/);
  if (garage) {
    f.garageMin = Number(garage[1]);
    chips.push({ key: "garageMin", label: `${f.garageMin}+ car garage` });
  } else flag(/\bgarage\b/, "garageMin", "Garage", 1);
  if (/\b(dog|dogs|pup|puppy)\b/.test(text)) {
    f.pets = "dogs";
    chips.push({ key: "pets", label: "Dog friendly" });
  } else if (/\b(cat|cats|kitten)\b/.test(text)) {
    f.pets = "cats";
    chips.push({ key: "pets", label: "Cat friendly" });
  } else flag(/\b(pet[- ]friendly|pets? (?:ok|allowed))\b/, "pets", "Pet friendly", "any");
  if (/\b(new listings?|new to market|just listed|listed this week)\b/.test(text)) {
    f.daysOnMarketMax = 7;
    chips.push({ key: "daysOnMarketMax", label: "Listed in last 7 days" });
  }
  if (mode === "sold") {
    const within = text.match(/\b(?:last|past)\s*(\d+)\s*(days?|months?|years?)\b/);
    if (within) {
      const n = Number(within[1]);
      f.soldWithinDays = within[2]!.startsWith("month") ? n * 30 : within[2]!.startsWith("year") ? n * 365 : n;
      chips.push({ key: "soldWithinDays", label: `Sold in last ${within[1]} ${within[2]}` });
    }
  }

  // 7. Schools
  const schoolRating = text.match(/\bschools? rated (\d+)\+?/);
  if (schoolRating) {
    f.schoolRatingMin = Math.min(10, Number(schoolRating[1]));
    chips.push({ key: "schoolRatingMin", label: `Schools ${f.schoolRatingMin}+/10` });
  } else if (/\b(top|best|great|excellent|highly rated|top[- ]rated)\s+schools?\b/.test(text)) {
    f.schoolRatingMin = 8;
    chips.push({ key: "schoolRatingMin", label: "Top-rated schools (8+)" });
  } else if (/\bgood schools?\b|\bschool district\b/.test(text)) {
    f.schoolRatingMin = 7;
    chips.push({ key: "schoolRatingMin", label: "Good schools (7+)" });
  }

  // 8. Year built
  const after = text.match(/\b(?:built (?:after|since)|newer than|post)\s*(\d{4})\b/);
  if (after) {
    f.yearBuilt = { min: Number(after[1]) };
    chips.push({ key: "yearBuilt", label: `Built ${after[1]}+` });
  }
  const before = text.match(/\b(?:built before|older than|pre)\s*(\d{4})\b/);
  if (before) {
    f.yearBuilt = { ...(f.yearBuilt ?? {}), max: Number(before[1]) };
    chips.push({ key: "yearBuiltMax", label: `Built before ${before[1]}` });
  } else if (/\bhistoric\b/.test(text)) {
    f.yearBuilt = { max: 1950 };
    chips.push({ key: "yearBuiltMax", label: "Historic (pre-1950)" });
  }

  // 9. Land specifics
  if (mode === "land") {
    const activities: string[] = [];
    const act: Array<[RegExp, string]> = [
      [/\bhunting\b/, "Hunting"],
      [/\bfishing\b/, "Fishing"],
      [/\bcamping\b/, "Camping"],
      [/\bhiking\b/, "Hiking"],
      [/\b(horses?|horseback|equestrian)\b/, "Horseback riding"],
      [/\b(atv|off[- ]road(?:ing)?)\b/, "Off-roading"],
      [/\bboating\b/, "Boating"],
    ];
    for (const [re, label] of act) if (re.test(text)) activities.push(label);
    if (activities.length) {
      f.activities = activities;
      chips.push({ key: "activities", label: activities.join(", ") });
    }
    const landTypes: string[] = [];
    if (/\branch(?:es)?\b/.test(text)) landTypes.push("Ranch");
    if (/\bfarm(?:land)?s?\b/.test(text)) landTypes.push("Farm");
    if (/\btimber(?:land)?\b/.test(text)) landTypes.push("Timberland");
    if (/\brecreational\b/.test(text)) landTypes.push("Recreational");
    if (/\b(homesite|buildable lot|residential lot)\b/.test(text)) landTypes.push("Residential lot");
    if (landTypes.length) {
      f.landTypes = landTypes;
      chips.push({ key: "landTypes", label: landTypes.join(", ") });
    }
    flag(/\b(creek|pond|river|lake|spring|water)\b/, "water", "Water on property");
  }

  // 10. Location ("in Austin", "near Denver, CO", "78704")
  let placeQuery: string | undefined;
  const zip = text.match(/\b(\d{5})\b/);
  if (zip) placeQuery = zip[1];
  else {
    const loc = text.match(/\b(?:in|near|around|close to|within)\s+([a-z][a-z .'-]{1,40}?)(?:,\s*([a-z]{2}))?(?=\s+(?:with|under|over|for|that|and|near|between|below|above|built|around|\d)|[.,!?]|\s*$)/);
    if (loc) {
      const candidate = loc[1]!
        .replace(/\b(the|a|an)\b/g, "")
        .replace(/\s+(neighbou?rhood|area|community|region|city|county|metro)s?\s*$/, "")
        .replace(/\s+/g, " ")
        .trim();
      if (candidate && !/\b(budget|school|schools|yard|pool|walking distance|downtown)\b/.test(candidate)) {
        placeQuery = loc[2] ? `${candidate}, ${loc[2]}` : candidate;
      }
    }
  }
  if (placeQuery) chips.unshift({ key: "place", label: placeQuery.replace(/\b\w/g, (c) => c.toUpperCase()) });

  return { mode, filters: f, chips, placeQuery, notices };
}
