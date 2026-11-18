import type { ListingCategoryKey, ListingStatusKey, MediaCategoryKey, PropertyTypeKey, TransactionTypeKey } from "@/lib/domain";

/** Serializable listing summary used by cards, rails, map popups and compare. */
export interface ListingCardData {
  id: string;
  slug: string;
  category: ListingCategoryKey;
  transactionType: TransactionTypeKey;
  status: ListingStatusKey;
  propertyType: PropertyTypeKey;
  headline: string | null;
  price: number;
  priceMax: number | null;
  priceReduction: number | null;
  priceReducedAt: string | null;
  soldPrice: number | null;
  soldDate: string | null;
  listDate: string;
  streetAddress: string;
  unit: string | null;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  beds: number | null;
  bedsMax: number | null;
  baths: number | null;
  sqft: number | null;
  lotSqft: number | null;
  lotAcres: number | null;
  pricePerSqft: number | null;
  pricePerAcre: number | null;
  leaseRate: number | null;
  capRate: number | null;
  availableSqft: number | null;
  isNewConstruction: boolean;
  isForeclosure: boolean;
  isFsbo: boolean;
  isLuxury: boolean;
  isCommunity: boolean;
  communityName: string | null;
  moveInSpecial: string | null;
  has3dTour: boolean;
  hasVideo: boolean;
  isDemo: boolean;
  brokerageName: string | null;
  listingAgentName: string | null;
  openHouse: { startsAt: string; endsAt: string; type: "IN_PERSON" | "VIRTUAL" } | null;
  photos: Array<{ url: string; alt: string; blurDataUrl: string | null; color: string | null; category: MediaCategoryKey }>;
  photoCount: number;
}

export interface MapPoint {
  id: string;
  slug: string;
  lat: number;
  lng: number;
  price: number;
  label: string;
  beds: number | null;
  ppsf: number | null;
  status: ListingStatusKey;
  category: ListingCategoryKey;
}

export interface SearchFacets {
  propertyTypes: Array<{ value: string; count: number }>;
  beds: Array<{ value: number; count: number }>;
  priceStats: { min: number; max: number; median: number } | null;
}

export interface SearchResult {
  results: ListingCardData[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  points: MapPoint[];
  facets: SearchFacets;
  bbox: [number, number, number, number] | null;
  spatial: "postgis" | "fallback" | "none";
  provider: string;
  tookMs: number;
}

export type SuggestionType = "city" | "neighborhood" | "zip" | "state" | "school" | "address" | "mls" | "agent";

export interface Suggestion {
  type: SuggestionType;
  label: string;
  sublabel?: string;
  /** Where selecting the suggestion should go: a place slug for search, or a direct URL. */
  place?: string;
  href?: string;
}
