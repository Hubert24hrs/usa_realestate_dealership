import "server-only";
import type { Prisma } from "@prisma/client";
import { formatCompactPrice } from "@/lib/format";
import type { ListingCardData, MapPoint } from "@/lib/search/types";
import type { ListingCategoryKey, ListingStatusKey, MediaCategoryKey, PropertyTypeKey, TransactionTypeKey } from "@/lib/domain";

export function cardSelect(now = new Date()) {
  return {
    id: true,
    slug: true,
    category: true,
    transactionType: true,
    status: true,
    propertyType: true,
    headline: true,
    price: true,
    priceMax: true,
    priceReduction: true,
    priceReducedAt: true,
    soldPrice: true,
    soldDate: true,
    listDate: true,
    streetAddress: true,
    unit: true,
    city: true,
    state: true,
    zip: true,
    lat: true,
    lng: true,
    beds: true,
    baths: true,
    sqft: true,
    lotSqft: true,
    lotAcres: true,
    pricePerSqft: true,
    pricePerAcre: true,
    leaseRate: true,
    capRate: true,
    availableSqft: true,
    isNewConstruction: true,
    isForeclosure: true,
    isFsbo: true,
    isLuxury: true,
    isCommunity: true,
    communityName: true,
    moveInSpecial: true,
    has3dTour: true,
    hasVideo: true,
    isDemo: true,
    hideAddress: true,
    brokerageName: true,
    listingAgentName: true,
    media: {
      orderBy: { sortOrder: "asc" },
      // Cards carry a handful of photos; the last slide links to the full gallery (photoCount).
      take: 5,
      select: { url: true, alt: true, blurDataUrl: true, color: true, category: true },
    },
    openHouses: {
      where: { endsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 1,
      select: { startsAt: true, endsAt: true, type: true },
    },
    units: { where: { isAvailable: true }, select: { beds: true } },
    _count: { select: { media: true } },
  } satisfies Prisma.ListingSelect;
}

export type CardRow = Prisma.ListingGetPayload<{ select: ReturnType<typeof cardSelect> }>;

export function toCardData(row: CardRow): ListingCardData {
  const unitBeds = row.units.map((u) => u.beds);
  return {
    id: row.id,
    slug: row.slug,
    category: row.category as ListingCategoryKey,
    transactionType: row.transactionType as TransactionTypeKey,
    status: row.status as ListingStatusKey,
    propertyType: row.propertyType as PropertyTypeKey,
    headline: row.headline,
    price: row.price,
    priceMax: row.priceMax,
    priceReduction: row.priceReduction,
    priceReducedAt: row.priceReducedAt?.toISOString() ?? null,
    soldPrice: row.soldPrice,
    soldDate: row.soldDate?.toISOString() ?? null,
    listDate: row.listDate.toISOString(),
    streetAddress: row.hideAddress ? "Address withheld" : row.streetAddress,
    unit: row.unit,
    city: row.city,
    state: row.state,
    zip: row.zip,
    lat: row.lat,
    lng: row.lng,
    beds: unitBeds.length ? Math.min(...unitBeds) : row.beds,
    bedsMax: unitBeds.length ? Math.max(...unitBeds) : null,
    baths: row.baths,
    sqft: row.sqft,
    lotSqft: row.lotSqft,
    lotAcres: row.lotAcres,
    pricePerSqft: row.pricePerSqft,
    pricePerAcre: row.pricePerAcre,
    leaseRate: row.leaseRate,
    capRate: row.capRate,
    availableSqft: row.availableSqft,
    isNewConstruction: row.isNewConstruction,
    isForeclosure: row.isForeclosure,
    isFsbo: row.isFsbo,
    isLuxury: row.isLuxury,
    isCommunity: row.isCommunity,
    communityName: row.communityName,
    moveInSpecial: row.moveInSpecial,
    has3dTour: row.has3dTour,
    hasVideo: row.hasVideo,
    isDemo: row.isDemo,
    brokerageName: row.brokerageName,
    listingAgentName: row.listingAgentName,
    openHouse: row.openHouses[0]
      ? { startsAt: row.openHouses[0].startsAt.toISOString(), endsAt: row.openHouses[0].endsAt.toISOString(), type: row.openHouses[0].type }
      : null,
    // Only the cover photo needs a blur placeholder; the rest load when someone swipes (keeps RSC payloads small).
    photos: row.media.map((m, i) => ({ url: m.url, alt: row.hideAddress ? m.alt.split(row.streetAddress).join("this home") : m.alt, blurDataUrl: i === 0 ? m.blurDataUrl : null, color: m.color, category: m.category as MediaCategoryKey })),
    photoCount: row._count.media,
  };
}

export const pointSelect = {
  id: true,
  slug: true,
  lat: true,
  lng: true,
  price: true,
  beds: true,
  pricePerSqft: true,
  status: true,
  category: true,
  transactionType: true,
  leaseRate: true,
  sqft: true,
} satisfies Prisma.ListingSelect;

export function mapLabel(row: { price: number; category: string; transactionType: string; leaseRate: number | null }): string {
  if (row.transactionType === "LEASE" && row.leaseRate) return `$${Math.round(row.leaseRate)}/SF`;
  if (row.transactionType === "RENT") return row.price >= 10_000 ? formatCompactPrice(row.price) : `$${(row.price / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return formatCompactPrice(row.price);
}

export function toMapPoint(row: Prisma.ListingGetPayload<{ select: typeof pointSelect }>): MapPoint {
  return {
    id: row.id,
    slug: row.slug,
    lat: row.lat,
    lng: row.lng,
    price: row.price,
    label: mapLabel(row),
    beds: row.beds,
    ppsf: row.pricePerSqft ?? (row.sqft ? Math.round(row.price / row.sqft) : null),
    status: row.status as ListingStatusKey,
    category: row.category as ListingCategoryKey,
  };
}

/** Rails show only the cover photo (no in-card carousel), which keeps page payloads and DOM small. */
export const railCard = (c: ListingCardData): ListingCardData => (c.photos.length > 1 ? { ...c, photos: c.photos.slice(0, 1) } : c);
