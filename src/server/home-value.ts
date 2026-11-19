import "server-only";
import { db } from "@/lib/db";
import { type Comp, type Condition, haversineMi, valueHome } from "@/lib/avm";
import { getCityMarkets } from "./markets";

export interface HomeValueInput {
  address?: string;
  citySlug: string;
  zip?: string;
  propertyType: string;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt?: number;
  hasPool?: boolean;
  garageSpaces?: number;
  condition: Condition;
}

/** Comps-based estimate on CITI VIEW's (demo) sales data, plus market context. */
export async function estimateHomeValue(input: HomeValueInput) {
  const markets = await getCityMarkets();
  const market = markets.find((m) => m.slug === input.citySlug);
  const city = market ? await db.city.findUnique({ where: { slug: input.citySlug }, select: { id: true, lat: true, lng: true } }) : null;
  if (!market || !city) return null;

  // If the address matches a home we know, use its exact location (and don't comp it against itself).
  const street = input.address?.split(",")[0]?.trim();
  const known = street && street.length > 4 ? await db.listing.findFirst({ where: { streetAddress: { equals: street, mode: "insensitive" }, ...(input.zip ? { zip: input.zip } : { cityId: city.id }) }, select: { id: true, lat: true, lng: true } }) : null;

  const rows = await db.listing.findMany({
    where: {
      category: "RESIDENTIAL",
      transactionType: "SALE",
      status: { in: ["SOLD", "ACTIVE", "PENDING", "COMING_SOON"] },
      sqft: { gt: 0 },
      OR: [{ cityId: city.id }, { state: market.stateCode }],
      ...(known ? { id: { not: known.id } } : {}),
    },
    take: 400,
    select: {
      id: true, slug: true, streetAddress: true, unit: true, city: true, state: true, hideAddress: true, status: true, price: true, soldPrice: true, soldDate: true, listDate: true,
      beds: true, baths: true, sqft: true, yearBuilt: true, propertyType: true, zip: true, lat: true, lng: true, hasPool: true, garageSpaces: true, cityId: true,
      media: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, alt: true, blurDataUrl: true } },
    },
  });
  const comps: Comp[] = rows
    .filter((r) => r.cityId === city.id || haversineMi(city.lat, city.lng, r.lat, r.lng) <= 60)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      address: r.hideAddress ? `${r.city}, ${r.state} (address on request)` : `${r.streetAddress}${r.unit ? ` #${r.unit}` : ""}, ${r.city}`,
      status: r.status,
      price: r.status === "SOLD" && r.soldPrice ? r.soldPrice : r.price,
      date: (r.status === "SOLD" ? r.soldDate : null) ?? r.listDate,
      beds: r.beds ?? 0,
      baths: r.baths ?? 0,
      sqft: r.sqft ?? 0,
      yearBuilt: r.yearBuilt,
      propertyType: r.propertyType,
      zip: r.zip,
      lat: r.lat,
      lng: r.lng,
      hasPool: r.hasPool,
      garageSpaces: r.garageSpaces ?? 0,
      photo: r.media[0] ?? null,
    }));

  const valuation = valueHome(
    { propertyType: input.propertyType, beds: input.beds, baths: input.baths, sqft: input.sqft, yearBuilt: input.yearBuilt ?? null, zip: input.zip || null, lat: known?.lat ?? null, lng: known?.lng ?? null, hasPool: input.hasPool, garageSpaces: input.garageSpaces, condition: input.condition },
    comps,
    market.medianPpsf,
  );
  const lists = market.months.map((m) => m.list);
  const yoy = lists.length > 12 && lists[lists.length - 13] ? lists[lists.length - 1]! / lists[lists.length - 13]! - 1 : null;
  return {
    valuation,
    market: { name: market.name, stateCode: market.stateCode, slug: market.slug, medianPpsf: market.medianPpsf, medianHomeValue: market.medianHomeValue, medianDom: market.medianDom, listPriceYoY: yoy },
  };
}
