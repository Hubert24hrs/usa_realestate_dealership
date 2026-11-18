import type {
  ListingCategoryKey,
  MediaCategoryKey,
  PropertyTypeKey,
} from "@/lib/domain";
import type { Rng } from "@/lib/random";

/**
 * Seed image pools. Each pool is a room/scene type with the stock-library
 * queries used to fill it. Pools are fetched once (scripts/media-fetch.ts) and
 * cached in data/media-pool.json with full attribution, then assigned so that
 * no photo repeats within a property — or across properties.
 */
export const POOLS = {
  EXTERIOR_HOUSE: {
    category: "EXTERIOR",
    queries: [
      "modern house exterior",
      "suburban house front",
      "craftsman house",
      "brick house exterior",
      "farmhouse exterior",
      "luxury home exterior",
      "bungalow house",
      "two story house",
      "mid century modern house",
    ],
  },
  EXTERIOR_TOWNHOME: { category: "EXTERIOR", queries: ["townhouse exterior", "row houses street", "townhomes"] },
  EXTERIOR_BUILDING: {
    category: "EXTERIOR",
    queries: ["apartment building exterior", "condominium building", "residential tower", "modern apartment complex"],
  },
  EXTERIOR_COMMERCIAL: {
    category: "EXTERIOR",
    queries: ["office building exterior", "commercial building facade", "retail storefront street", "warehouse building exterior"],
  },
  LIVING_ROOM: {
    category: "LIVING_ROOM",
    queries: ["living room interior", "modern living room", "cozy living room", "living room interior design"],
  },
  KITCHEN: { category: "KITCHEN", queries: ["modern kitchen interior", "kitchen island", "white kitchen interior", "kitchen design"] },
  DINING_ROOM: { category: "DINING_ROOM", queries: ["dining room interior", "dining table interior design", "dining area interior"] },
  PRIMARY_BEDROOM: { category: "PRIMARY_BEDROOM", queries: ["master bedroom interior", "luxury bedroom interior", "bedroom interior design"] },
  BEDROOM: { category: "BEDROOM", queries: ["bedroom interior", "guest bedroom", "minimalist bedroom"] },
  BATHROOM: { category: "BATHROOM", queries: ["bathroom interior", "modern bathroom", "bathroom vanity", "bathtub interior"] },
  BACKYARD: { category: "BACKYARD", queries: ["backyard patio", "backyard garden", "backyard swimming pool", "outdoor patio furniture"] },
  AERIAL_RESIDENTIAL: { category: "AERIAL", queries: ["aerial view houses", "drone view neighborhood", "aerial suburb homes"] },
  AERIAL_COMMERCIAL: { category: "AERIAL", queries: ["aerial view city buildings", "drone view downtown"] },
  AERIAL_LAND: { category: "AERIAL", queries: ["aerial farmland", "drone view fields", "aerial view forest"] },
  AMENITY: { category: "AMENITY", queries: ["apartment swimming pool", "fitness center interior", "rooftop terrace", "lounge interior"] },
  VIEW: { category: "VIEW", queries: ["city view from window", "balcony city view", "skyline view apartment"] },
  OFFICE: { category: "OFFICE", queries: ["modern office interior", "open office space", "conference room", "coworking space"] },
  LOBBY: { category: "LOBBY", queries: ["building lobby", "office lobby interior", "lobby interior design"] },
  WAREHOUSE: { category: "WAREHOUSE", queries: ["warehouse interior", "industrial warehouse", "loading dock warehouse"] },
  RETAIL_SPACE: { category: "RETAIL_SPACE", queries: ["empty retail space", "store interior", "boutique interior"] },
  LAND: { category: "LAND", queries: ["open field landscape", "rolling hills landscape", "meadow landscape", "prairie landscape"] },
  WATER: { category: "WATER", queries: ["creek in forest", "pond landscape", "river landscape", "lake shore landscape"] },
  FOREST: { category: "FOREST", queries: ["forest trees", "pine forest", "woodland trees"] },
  PASTURE: { category: "PASTURE", queries: ["pasture", "farm field", "ranch landscape", "grazing land"] },
  STRUCTURE: { category: "STRUCTURE", queries: ["red barn", "old barn", "rustic cabin"] },
} as const satisfies Record<string, { category: MediaCategoryKey; queries: readonly string[] }>;

export type PoolKey = keyof typeof POOLS;
export const POOL_KEYS = Object.keys(POOLS) as PoolKey[];

export interface MediaPlanInput {
  category: ListingCategoryKey;
  propertyType: PropertyTypeKey;
  isCommunity?: boolean;
}

/** Room/scene plan for a property: 7–11 photo slots (a generated floor plan/topo map is added after). */
export function mediaPlan(input: MediaPlanInput, rng: Rng): PoolKey[] {
  const optional = (keys: PoolKey[], keep: number) => rng.sample(keys, keep);
  const { category, propertyType } = input;

  if (category === "LAND") {
    const base: PoolKey[] = ["LAND", "AERIAL_LAND", "LAND"];
    const extras: PoolKey[] = propertyType === "FARM_RANCH"
      ? ["PASTURE", "PASTURE", "STRUCTURE", "WATER", "FOREST", "EXTERIOR_HOUSE"]
      : ["WATER", "FOREST", "PASTURE", "FOREST", "STRUCTURE", "LAND"];
    return [...base, ...optional(extras, rng.int(4, 6))];
  }

  if (category === "COMMERCIAL") {
    switch (propertyType) {
      case "INDUSTRIAL":
        return ["EXTERIOR_COMMERCIAL", "AERIAL_COMMERCIAL", "WAREHOUSE", "WAREHOUSE", "WAREHOUSE", "OFFICE", ...optional(["LOBBY", "EXTERIOR_COMMERCIAL"], 1)];
      case "RETAIL":
        return ["EXTERIOR_COMMERCIAL", "RETAIL_SPACE", "RETAIL_SPACE", "AERIAL_COMMERCIAL", "RETAIL_SPACE", ...optional(["LOBBY", "EXTERIOR_COMMERCIAL", "OFFICE"], 2)];
      case "MULTI_FAMILY":
        return ["EXTERIOR_BUILDING", "AERIAL_COMMERCIAL", "LIVING_ROOM", "KITCHEN", "BEDROOM", "BATHROOM", ...optional(["AMENITY", "LOBBY", "VIEW"], 2)];
      case "MIXED_USE":
        return ["EXTERIOR_COMMERCIAL", "AERIAL_COMMERCIAL", "RETAIL_SPACE", "LOBBY", "OFFICE", "LIVING_ROOM", ...optional(["KITCHEN", "VIEW", "AMENITY"], 2)];
      default:
        return ["EXTERIOR_COMMERCIAL", "LOBBY", "OFFICE", "OFFICE", "OFFICE", "AERIAL_COMMERCIAL", ...optional(["VIEW", "AMENITY", "LOBBY"], 2)];
    }
  }

  if (input.isCommunity || propertyType === "APARTMENT") {
    return ["EXTERIOR_BUILDING", "AMENITY", "LIVING_ROOM", "KITCHEN", "PRIMARY_BEDROOM", "BATHROOM", ...optional(["AMENITY", "VIEW", "DINING_ROOM", "BEDROOM", "LOBBY"], rng.int(2, 3))];
  }

  if (propertyType === "CONDO") {
    return ["EXTERIOR_BUILDING", "LIVING_ROOM", "KITCHEN", "PRIMARY_BEDROOM", "BATHROOM", "VIEW", ...optional(["DINING_ROOM", "AMENITY", "BEDROOM", "LOBBY"], rng.int(2, 3))];
  }

  if (propertyType === "TOWNHOUSE") {
    return ["EXTERIOR_TOWNHOME", "LIVING_ROOM", "KITCHEN", "PRIMARY_BEDROOM", "BATHROOM", ...optional(["DINING_ROOM", "BEDROOM", "BACKYARD", "BATHROOM", "AERIAL_RESIDENTIAL"], rng.int(3, 4))];
  }

  // Single-family, multi-family, manufactured
  return [
    "EXTERIOR_HOUSE",
    "LIVING_ROOM",
    "KITCHEN",
    "PRIMARY_BEDROOM",
    "BATHROOM",
    "BACKYARD",
    ...optional(["EXTERIOR_HOUSE", "DINING_ROOM", "BEDROOM", "BATHROOM", "AERIAL_RESIDENTIAL", "BEDROOM"], rng.int(3, 5)),
  ];
}

/** Sort slots into the order a buyer expects to browse them. */
const DISPLAY_ORDER: MediaCategoryKey[] = [
  "EXTERIOR",
  "LIVING_ROOM",
  "KITCHEN",
  "DINING_ROOM",
  "PRIMARY_BEDROOM",
  "BEDROOM",
  "BATHROOM",
  "OFFICE",
  "LOBBY",
  "RETAIL_SPACE",
  "WAREHOUSE",
  "AMENITY",
  "VIEW",
  "BACKYARD",
  "LAND",
  "PASTURE",
  "WATER",
  "FOREST",
  "STRUCTURE",
  "AERIAL",
  "TOPOGRAPHY",
  "FLOOR_PLAN",
  "OTHER",
];

export function displayRank(category: MediaCategoryKey): number {
  const idx = DISPLAY_ORDER.indexOf(category);
  return idx === -1 ? DISPLAY_ORDER.length : idx;
}
