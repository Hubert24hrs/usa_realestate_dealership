/**
 * Client-safe domain vocabulary. Mirrors the Prisma enums (string unions) so
 * client components never import @prisma/client.
 */

export const PROPERTY_TYPES = [
  "SINGLE_FAMILY",
  "CONDO",
  "TOWNHOUSE",
  "MULTI_FAMILY",
  "MANUFACTURED",
  "APARTMENT",
  "LAND",
  "FARM_RANCH",
  "OFFICE",
  "RETAIL",
  "INDUSTRIAL",
  "MIXED_USE",
  "HOSPITALITY",
] as const;
export type PropertyTypeKey = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyTypeKey, string> = {
  SINGLE_FAMILY: "House",
  CONDO: "Condo",
  TOWNHOUSE: "Townhome",
  MULTI_FAMILY: "Multi-family",
  MANUFACTURED: "Manufactured",
  APARTMENT: "Apartment",
  LAND: "Land",
  FARM_RANCH: "Farm & ranch",
  OFFICE: "Office",
  RETAIL: "Retail",
  INDUSTRIAL: "Industrial",
  MIXED_USE: "Mixed use",
  HOSPITALITY: "Hospitality",
};

export const RESIDENTIAL_TYPES: PropertyTypeKey[] = [
  "SINGLE_FAMILY",
  "CONDO",
  "TOWNHOUSE",
  "MULTI_FAMILY",
  "MANUFACTURED",
];
export const RENTAL_TYPES: PropertyTypeKey[] = ["APARTMENT", "SINGLE_FAMILY", "CONDO", "TOWNHOUSE"];
export const COMMERCIAL_TYPES: PropertyTypeKey[] = [
  "OFFICE",
  "RETAIL",
  "INDUSTRIAL",
  "MIXED_USE",
  "MULTI_FAMILY",
  "HOSPITALITY",
];
export const LAND_PROPERTY_TYPES: PropertyTypeKey[] = ["LAND", "FARM_RANCH"];

export type ListingCategoryKey = "RESIDENTIAL" | "RENTAL" | "COMMERCIAL" | "LAND";
export type TransactionTypeKey = "SALE" | "RENT" | "LEASE";
export type ListingStatusKey =
  | "ACTIVE"
  | "COMING_SOON"
  | "PENDING"
  | "SOLD"
  | "RENTED"
  | "OFF_MARKET"
  | "DRAFT";

export const STATUS_LABELS: Record<ListingStatusKey, string> = {
  ACTIVE: "Active",
  COMING_SOON: "Coming soon",
  PENDING: "Pending",
  SOLD: "Sold",
  RENTED: "Rented",
  OFF_MARKET: "Off market",
  DRAFT: "Draft",
};

export const MEDIA_CATEGORIES = [
  "EXTERIOR",
  "LIVING_ROOM",
  "KITCHEN",
  "DINING_ROOM",
  "PRIMARY_BEDROOM",
  "BEDROOM",
  "BATHROOM",
  "BACKYARD",
  "AERIAL",
  "FLOOR_PLAN",
  "AMENITY",
  "VIEW",
  "OFFICE",
  "LOBBY",
  "WAREHOUSE",
  "RETAIL_SPACE",
  "LAND",
  "WATER",
  "FOREST",
  "PASTURE",
  "STRUCTURE",
  "TOPOGRAPHY",
  "OTHER",
] as const;
export type MediaCategoryKey = (typeof MEDIA_CATEGORIES)[number];

export const MEDIA_CATEGORY_LABELS: Record<MediaCategoryKey, string> = {
  EXTERIOR: "Exterior",
  LIVING_ROOM: "Living room",
  KITCHEN: "Kitchen",
  DINING_ROOM: "Dining",
  PRIMARY_BEDROOM: "Primary bedroom",
  BEDROOM: "Bedrooms",
  BATHROOM: "Bathrooms",
  BACKYARD: "Outdoor space",
  AERIAL: "Aerial",
  FLOOR_PLAN: "Floor plan",
  AMENITY: "Amenities",
  VIEW: "Views",
  OFFICE: "Workspace",
  LOBBY: "Lobby & common",
  WAREHOUSE: "Warehouse",
  RETAIL_SPACE: "Retail space",
  LAND: "Land",
  WATER: "Water",
  FOREST: "Timber",
  PASTURE: "Pasture",
  STRUCTURE: "Structures",
  TOPOGRAPHY: "Topography",
  OTHER: "Other",
};

export type MediaProviderKey = "PEXELS" | "UNSPLASH" | "GENERATED" | "FEED" | "UPLOAD";

/** Search "modes" map to the hero tabs: Buy | Rent | New Build | Sold | Commercial | Land */
export const SEARCH_MODES = ["buy", "rent", "new", "sold", "commercial", "land"] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

export const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  buy: "Buy",
  rent: "Rent",
  new: "New Build",
  sold: "Sold",
  commercial: "Commercial",
  land: "Land",
};

/** SEO vertical path segment for each mode (homes-for-sale, apartments-for-rent, …). */
export const MODE_VERTICAL: Record<SearchMode, string> = {
  buy: "homes-for-sale",
  rent: "apartments-for-rent",
  new: "new-construction",
  sold: "sold-homes",
  commercial: "commercial-real-estate",
  land: "land-for-sale",
};

export const LAND_TYPES = [
  "Recreational",
  "Farm",
  "Ranch",
  "Timberland",
  "Hunting",
  "Residential lot",
  "Waterfront",
  "Undeveloped",
] as const;

export const LAND_ACTIVITIES = [
  "Hunting",
  "Fishing",
  "Camping",
  "Hiking",
  "Horseback riding",
  "Off-roading",
  "Boating",
  "Bird watching",
  "Stargazing",
] as const;

export const AMENITY_LABELS: Record<string, string> = {
  GROCERY: "Groceries",
  PARK: "Parks",
  RESTAURANT: "Restaurants",
  COFFEE: "Coffee",
  GYM: "Fitness",
  TRANSIT: "Transit",
  HOSPITAL: "Healthcare",
  SHOPPING: "Shopping",
  LIBRARY: "Libraries",
};

export const LEAD_TYPE_LABELS: Record<string, string> = {
  TOUR: "Tour request",
  REQUEST_INFO: "Info request",
  ASK_AGENT: "Agent question",
  OFFER_INTEREST: "Offer interest",
  CONTACT_AGENT: "Contact agent",
  PREAPPROVAL: "Pre-approval",
  SELLER_CONSULT: "Seller consult",
  HOME_VALUE: "Home value",
  OM_REQUEST: "OM request",
  RENTAL_INQUIRY: "Rental inquiry",
};
