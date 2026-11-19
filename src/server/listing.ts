import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { haversineMiles } from "@/lib/geo";
import { cardSelect, railCard, toCardData } from "./search/card";

export const listingInclude = () => ({
  media: { orderBy: { sortOrder: "asc" } },
  priceHistory: { orderBy: { date: "desc" } },
  taxHistory: { orderBy: { year: "desc" } },
  openHouses: { where: { endsAt: { gte: new Date(Date.now() - 3_600_000) } }, orderBy: { startsAt: "asc" } },
  units: { orderBy: [{ beds: "asc" }, { rent: "asc" }] },
  spaces: { orderBy: { sqft: "asc" } },
  documents: true,
  schools: { include: { school: { include: { district: { select: { name: true } } } } }, orderBy: { distanceMiles: "asc" } },
  agent: { include: { organization: true } },
  organization: true,
  neighborhood: true,
  cityRef: { include: { state: true } },
}) satisfies Prisma.ListingInclude;

export type ListingDetail = Prisma.ListingGetPayload<{ include: ReturnType<typeof listingInclude> }>;

export const getListingBySlug = cache(async (slug: string): Promise<ListingDetail | null> => {
  if (!/^[a-z0-9-]{3,140}$/.test(slug)) return null;
  return db.listing.findFirst({ where: { slug, status: { not: "DRAFT" } }, include: listingInclude() });
});

/** Similar homes, nearby sold comps and amenities around a listing. */
export async function getListingContext(l: ListingDetail) {
  const now = new Date();
  const select = cardSelect(now);
  const band = l.category === "RENTAL" ? 0.3 : 0.25;
  const [similar, comps, amenities] = await Promise.all([
    db.listing.findMany({
      where: {
        id: { not: l.id },
        cityId: l.cityId,
        category: l.category,
        status: { in: ["ACTIVE", "COMING_SOON"] },
        price: { gte: Math.round(l.price * (1 - band)), lte: Math.round(l.price * (1 + band * 1.6)) },
      },
      orderBy: { listDate: "desc" },
      take: 10,
      select,
    }),
    l.category === "RESIDENTIAL"
      ? db.listing.findMany({ where: { id: { not: l.id }, cityId: l.cityId, status: "SOLD" }, orderBy: { soldDate: "desc" }, take: 8, select })
      : Promise.resolve([]),
    l.cityId ? db.amenity.findMany({ where: { cityId: l.cityId } }) : Promise.resolve([]),
  ]);
  // Widen to the whole category if the city has few matches.
  const similarCards = similar.length >= 3 ? similar : [...similar, ...(await db.listing.findMany({ where: { id: { notIn: [l.id, ...similar.map((s) => s.id)] }, category: l.category, status: "ACTIVE" }, take: 8 - similar.length, select }))];
  const nearby = amenities
    .map((a) => ({ ...a, miles: haversineMiles(l, a) }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 14);
  return {
    similar: similarCards.map(toCardData).map(railCard),
    comps: comps.map((c) => ({ card: railCard(toCardData(c)), miles: haversineMiles(l, c) })).sort((a, b) => a.miles - b.miles),
    amenities: nearby.map((a) => ({ id: a.id, name: a.name, type: a.type, lat: a.lat, lng: a.lng, miles: Number(a.miles.toFixed(2)) })),
  };
}
