/**
 * Pure mapping from a RESO Data Dictionary 2.x `Property` record to CITI VIEW listing fields.
 * No I/O here (unit-tested); `src/server/feeds/reso-sync.ts` handles fetching and upserts.
 */
import type { ListingCategoryKey, ListingStatusKey, PropertyTypeKey, TransactionTypeKey } from "@/lib/domain";
import type { ProviderImage } from "@/lib/media/types";
import { mapResoMedia, type ResoMedia } from "@/lib/media/feed-provider";

/** The subset of RESO Property fields we read. Vendors may omit any of them. */
export interface ResoProperty {
  ListingKey: string;
  ListingId?: string | null;
  StandardStatus?: string | null;
  PropertyType?: string | null;
  PropertySubType?: string | null;
  ListPrice?: number | null;
  OriginalListPrice?: number | null;
  ClosePrice?: number | null;
  CloseDate?: string | null;
  OnMarketDate?: string | null;
  ListingContractDate?: string | null;
  ModificationTimestamp?: string | null;
  BedroomsTotal?: number | null;
  BathroomsTotalDecimal?: number | null;
  BathroomsTotalInteger?: number | null;
  BathroomsFull?: number | null;
  BathroomsHalf?: number | null;
  LivingArea?: number | null;
  LotSizeSquareFeet?: number | null;
  LotSizeAcres?: number | null;
  YearBuilt?: number | null;
  StoriesTotal?: number | null;
  GarageSpaces?: number | null;
  StreetNumber?: string | null;
  StreetDirPrefix?: string | null;
  StreetName?: string | null;
  StreetSuffix?: string | null;
  StreetDirSuffix?: string | null;
  UnitNumber?: string | null;
  UnparsedAddress?: string | null;
  City?: string | null;
  StateOrProvince?: string | null;
  PostalCode?: string | null;
  CountyOrParish?: string | null;
  Latitude?: number | null;
  Longitude?: number | null;
  PublicRemarks?: string | null;
  ListOfficeName?: string | null;
  ListAgentFullName?: string | null;
  AssociationFee?: number | null;
  AssociationFeeFrequency?: string | null;
  TaxAnnualAmount?: number | null;
  PoolPrivateYN?: boolean | null;
  WaterfrontYN?: boolean | null;
  ViewYN?: boolean | null;
  NewConstructionYN?: boolean | null;
  PetsAllowed?: string[] | null;
  VirtualTourURLUnbranded?: string | null;
  /** IDX opt-out: false means the listing may not be displayed on IDX sites at all. */
  InternetEntireListingDisplayYN?: boolean | null;
  /** false means the street address must be withheld. */
  InternetAddressDisplayYN?: boolean | null;
  Media?: ResoMedia[] | null;
}

export interface MappedListing {
  feedKey: string;
  mlsNumber: string | null;
  status: ListingStatusKey;
  category: ListingCategoryKey;
  transactionType: TransactionTypeKey;
  propertyType: PropertyTypeKey;
  price: number;
  originalPrice: number | null;
  soldPrice: number | null;
  soldDate: Date | null;
  listDate: Date;
  streetAddress: string;
  unit: string | null;
  city: string;
  state: string;
  zip: string;
  county: string | null;
  lat: number;
  lng: number;
  hideAddress: boolean;
  description: string;
  beds: number | null;
  baths: number | null;
  fullBaths: number | null;
  halfBaths: number | null;
  sqft: number | null;
  lotSqft: number | null;
  lotAcres: number | null;
  yearBuilt: number | null;
  stories: number | null;
  garageSpaces: number | null;
  hoaFee: number | null;
  propertyTaxAnnual: number | null;
  pricePerSqft: number | null;
  hasPool: boolean;
  isWaterfront: boolean;
  hasView: boolean;
  isNewConstruction: boolean;
  petsAllowed: boolean;
  virtualTourUrl: string | null;
  has3dTour: boolean;
  brokerageName: string | null;
  listingAgentName: string | null;
  attribution: string;
  media: ProviderImage[];
}

export type MapResult = { ok: true; listing: MappedListing } | { ok: false; reason: string };

const STATUS: Record<string, ListingStatusKey> = {
  active: "ACTIVE",
  "coming soon": "COMING_SOON",
  "active under contract": "PENDING",
  pending: "PENDING",
  closed: "SOLD",
  canceled: "OFF_MARKET",
  cancelled: "OFF_MARKET",
  expired: "OFF_MARKET",
  withdrawn: "OFF_MARKET",
  hold: "OFF_MARKET",
  delete: "OFF_MARKET",
  incomplete: "OFF_MARKET",
};

const SUBTYPE: Array<[RegExp, PropertyTypeKey]> = [
  [/single family|detached/i, "SINGLE_FAMILY"],
  [/condo|co-?op|stock cooperative/i, "CONDO"],
  [/town ?house|townhome|row ?house/i, "TOWNHOUSE"],
  [/duplex|triplex|quadruplex|multi/i, "MULTI_FAMILY"],
  [/manufactured|mobile/i, "MANUFACTURED"],
  [/apartment/i, "APARTMENT"],
  [/office/i, "OFFICE"],
  [/retail|shopping/i, "RETAIL"],
  [/industrial|warehouse|flex/i, "INDUSTRIAL"],
  [/mixed/i, "MIXED_USE"],
  [/hotel|motel|hospitality/i, "HOSPITALITY"],
  [/ranch|farm|agricultur/i, "FARM_RANCH"],
  [/land|lot|acreage/i, "LAND"],
];

const FEE_PER_YEAR: Record<string, number> = { monthly: 12, quarterly: 4, "semi-annually": 2, annually: 1, annual: 1, weekly: 52 };

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const num = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null);
const int = (n: number | null | undefined) => (num(n) == null ? null : Math.round(n!));

function categoryOf(p: ResoProperty, subtype: PropertyTypeKey): { category: ListingCategoryKey; transactionType: TransactionTypeKey } {
  const type = clean(p.PropertyType).toLowerCase();
  if (type.includes("lease")) {
    if (type.includes("commercial")) return { category: "COMMERCIAL", transactionType: "LEASE" };
    return { category: "RENTAL", transactionType: "RENT" };
  }
  if (type.includes("commercial") || type.includes("business") || ["OFFICE", "RETAIL", "INDUSTRIAL", "MIXED_USE", "HOSPITALITY"].includes(subtype)) return { category: "COMMERCIAL", transactionType: "SALE" };
  if (type.includes("land") || type.includes("farm") || subtype === "LAND" || subtype === "FARM_RANCH") return { category: "LAND", transactionType: "SALE" };
  return { category: "RESIDENTIAL", transactionType: "SALE" };
}

function streetLine(p: ResoProperty): string {
  const parts = [p.StreetNumber, p.StreetDirPrefix, p.StreetName, p.StreetSuffix, p.StreetDirSuffix].map(clean).filter(Boolean);
  if (parts.length >= 2) return parts.join(" ");
  // Fall back to the unparsed address up to the first comma ("123 Main St, Austin TX").
  return clean(p.UnparsedAddress).split(",")[0]!.trim();
}

/** Map one RESO Property; returns a reason instead when the record can't or mustn't be shown. */
export function mapResoProperty(p: ResoProperty, originatingSystem = "mls"): MapResult {
  if (!p.ListingKey) return { ok: false, reason: "missing ListingKey" };
  if (p.InternetEntireListingDisplayYN === false) return { ok: false, reason: "seller opted out of internet display (IDX)" };
  const statusKey = clean(p.StandardStatus).toLowerCase();
  const status = STATUS[statusKey];
  if (!status) return { ok: false, reason: `unsupported status "${p.StandardStatus ?? ""}"` };
  const street = streetLine(p);
  const city = clean(p.City);
  const state = clean(p.StateOrProvince).toUpperCase();
  const zip = clean(p.PostalCode).slice(0, 5);
  if (!street || !city || !/^[A-Z]{2}$/.test(state) || !/^\d{5}$/.test(zip)) return { ok: false, reason: "incomplete address" };
  if (typeof p.Latitude !== "number" || typeof p.Longitude !== "number" || !Number.isFinite(p.Latitude) || !Number.isFinite(p.Longitude) || (p.Latitude === 0 && p.Longitude === 0)) {
    return { ok: false, reason: "missing coordinates" };
  }
  const subtypeMatch = SUBTYPE.find(([re]) => re.test(`${p.PropertySubType ?? ""} ${p.PropertyType ?? ""}`));
  const propertyType: PropertyTypeKey = subtypeMatch?.[1] ?? "SINGLE_FAMILY";
  const { category, transactionType } = categoryOf(p, propertyType);
  const sold = status === "SOLD";
  const price = int(sold ? (p.ClosePrice ?? p.ListPrice) : p.ListPrice);
  if (!price) return { ok: false, reason: "missing price" };

  const sqft = int(p.LivingArea);
  const lotSqft = int(p.LotSizeSquareFeet) ?? (num(p.LotSizeAcres) != null ? Math.round(p.LotSizeAcres! * 43_560) : null);
  const lotAcres = num(p.LotSizeAcres) ?? (lotSqft ? Math.round((lotSqft / 43_560) * 100) / 100 : null);
  const feePerYear = FEE_PER_YEAR[clean(p.AssociationFeeFrequency).toLowerCase()] ?? 12;
  const hoaFee = num(p.AssociationFee) != null ? Math.round((p.AssociationFee! * feePerYear) / 12) : null;
  const baths = num(p.BathroomsTotalDecimal) ?? (p.BathroomsFull != null || p.BathroomsHalf != null ? (p.BathroomsFull ?? 0) + 0.5 * (p.BathroomsHalf ?? 0) : num(p.BathroomsTotalInteger));
  const office = clean(p.ListOfficeName) || null;
  const tour = clean(p.VirtualTourURLUnbranded);
  const listDate = new Date(p.OnMarketDate ?? p.ListingContractDate ?? p.ModificationTimestamp ?? Date.now());
  const media = (p.Media ?? [])
    .filter((m) => !m.Permission || m.Permission.includes("IDX"))
    .filter((m) => /^https:\/\//i.test(m.MediaURL ?? "") && !/video|virtual tour/i.test(m.MediaCategory ?? ""))
    .sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0))
    .map(mapResoMedia);

  return {
    ok: true,
    listing: {
      feedKey: `${originatingSystem}:${p.ListingKey}`,
      mlsNumber: clean(p.ListingId) || null,
      status,
      category,
      transactionType,
      propertyType,
      price,
      originalPrice: int(p.OriginalListPrice),
      soldPrice: sold ? price : null,
      soldDate: sold && p.CloseDate ? new Date(p.CloseDate) : null,
      listDate: Number.isNaN(listDate.getTime()) ? new Date() : listDate,
      streetAddress: street,
      unit: clean(p.UnitNumber) || null,
      city,
      state,
      zip,
      county: clean(p.CountyOrParish) || null,
      lat: p.Latitude,
      lng: p.Longitude,
      hideAddress: p.InternetAddressDisplayYN === false,
      description: clean(p.PublicRemarks) || `${propertyType.replace(/_/g, " ").toLowerCase()} in ${city}, ${state}.`,
      beds: int(p.BedroomsTotal),
      baths,
      fullBaths: int(p.BathroomsFull),
      halfBaths: int(p.BathroomsHalf),
      sqft,
      lotSqft,
      lotAcres,
      yearBuilt: int(p.YearBuilt),
      stories: int(p.StoriesTotal),
      garageSpaces: int(p.GarageSpaces),
      hoaFee,
      propertyTaxAnnual: int(p.TaxAnnualAmount),
      pricePerSqft: transactionType === "SALE" && sqft ? Math.round(price / sqft) : null,
      hasPool: p.PoolPrivateYN === true,
      isWaterfront: p.WaterfrontYN === true,
      hasView: p.ViewYN === true,
      isNewConstruction: p.NewConstructionYN === true,
      petsAllowed: Boolean(p.PetsAllowed?.some((v) => !/^no$|not allowed|none/i.test(v))),
      virtualTourUrl: /^https:\/\//i.test(tour) ? tour : null,
      has3dTour: /^https:\/\//i.test(tour),
      brokerageName: office,
      listingAgentName: clean(p.ListAgentFullName) || null,
      attribution: office ? `Listing courtesy of ${office}` : "Listing provided via MLS/IDX feed",
      media,
    },
  };
}
