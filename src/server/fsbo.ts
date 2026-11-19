import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import type { FsboPayload } from "@/lib/validation/fsbo";
import type { SessionUser } from "./auth-helpers";

export class FsboError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Approximate a pin near the city center (deterministic per address) — owners can't geocode here. */
export function approxLocation(seed: string, lat: number, lng: number) {
  const h = createHash("sha256").update(seed).digest();
  const dx = (h.readUInt16BE(0) / 65_535 - 0.5) * 0.06;
  const dy = (h.readUInt16BE(2) / 65_535 - 0.5) * 0.06;
  return { lat: Number((lat + dy).toFixed(6)), lng: Number((lng + dx).toFixed(6)) };
}

export async function createFsboListing(user: SessionUser, p: FsboPayload) {
  const city = await db.city.findUnique({ where: { slug: p.citySlug }, select: { id: true, name: true, stateCode: true, county: true, lat: true, lng: true } });
  if (!city) throw new FsboError("Choose one of the supported cities.");

  // Every photo must be the owner's own, unused upload.
  const ids = [...new Set(p.photos.map((ph) => ph.uploadId))];
  if (ids.length !== p.photos.length) throw new FsboError("Each photo can only be used once.");
  const uploads = await db.upload.findMany({ where: { id: { in: ids }, userId: user.id }, select: { id: true, url: true, width: true, height: true } });
  if (uploads.length !== ids.length) throw new FsboError("Some photos are missing. Please upload them again.", 409);
  const used = await db.listingMedia.count({ where: { provider: "UPLOAD", providerId: { in: ids.map((id) => `upload:${id}`) } } });
  if (used) throw new FsboError("Some photos are already used on another listing.", 409);

  // One active owner listing per address.
  const dup = await db.listing.findFirst({
    where: { ownerId: user.id, streetAddress: { equals: p.streetAddress, mode: "insensitive" }, unit: p.unit || null, zip: p.zip, status: { in: ["ACTIVE", "COMING_SOON", "PENDING", "DRAFT"] } },
    select: { slug: true },
  });
  if (dup) throw new FsboError("You already have an active listing for this address.", 409);

  const rent = p.mode === "rent";
  const slug = `${slugify(`${p.streetAddress}${p.unit ? ` unit ${p.unit}` : ""} ${city.name} ${city.stateCode} ${p.zip}`)}-${randomBytes(2).toString("hex")}`;
  const { lat, lng } = approxLocation(`${p.streetAddress}|${p.zip}`, city.lat, city.lng);
  const features = new Set(p.features);
  const byId = new Map(uploads.map((u) => [u.id, u]));
  const now = new Date();
  const ownerLabel = rent ? "For rent by owner" : "For sale by owner";

  const data: Prisma.ListingUncheckedCreateInput = {
    slug,
    category: rent ? "RENTAL" : "RESIDENTIAL",
    transactionType: rent ? "RENT" : "SALE",
    status: "ACTIVE",
    propertyType: p.propertyType,
    source: "FSBO",
    isDemo: false,
    isFsbo: true,
    headline: p.headline,
    description: p.description,
    price: p.price,
    pricePerSqft: rent ? null : Math.round(p.price / p.sqft),
    listDate: now,
    streetAddress: p.streetAddress,
    unit: p.unit || null,
    city: city.name,
    state: city.stateCode,
    zip: p.zip,
    county: city.county,
    lat,
    lng,
    hideAddress: p.hideAddress,
    cityId: city.id,
    beds: p.beds,
    baths: p.baths,
    fullBaths: Math.floor(p.baths),
    halfBaths: p.baths % 1 ? 1 : 0,
    sqft: p.sqft,
    lotSqft: p.lotSqft ?? null,
    lotAcres: p.lotSqft ? Number((p.lotSqft / 43_560).toFixed(2)) : null,
    yearBuilt: p.yearBuilt ?? null,
    stories: p.stories ?? null,
    garageSpaces: p.garageSpaces,
    hoaFee: p.hoaFee ?? null,
    hasPool: features.has("hasPool"),
    hasFireplace: features.has("hasFireplace"),
    hasAC: features.has("hasAC"),
    hasYard: features.has("hasYard"),
    hasBasement: features.has("hasBasement"),
    hasView: features.has("hasView"),
    isWaterfront: features.has("isWaterfront"),
    ...(rent && p.rent
      ? {
          availableDate: new Date(`${p.rent.availableDate}T12:00:00Z`),
          leaseTermMonths: p.rent.leaseTermMonths,
          securityDeposit: p.rent.securityDeposit,
          catsAllowed: p.rent.catsAllowed,
          dogsAllowed: p.rent.dogsAllowed,
          petsAllowed: p.rent.catsAllowed || p.rent.dogsAllowed,
          furnished: p.rent.furnished,
          applicationFee: 0,
        }
      : {}),
    ownerId: user.id,
    brokerageName: ownerLabel,
    listingAgentName: user.name ?? "Owner",
    attribution: `${ownerLabel}, listed directly by the owner on CITI VIEW.`,
  };

  const listing = await db.$transaction(async (tx) => {
    const l = await tx.listing.create({ data, select: { id: true, slug: true } });
    await tx.listingMedia.createMany({
      data: p.photos.map((ph, i) => {
        const u = byId.get(ph.uploadId)!;
        return {
          listingId: l.id,
          type: ph.category === "FLOOR_PLAN" ? ("FLOOR_PLAN" as const) : ("PHOTO" as const),
          category: ph.category,
          url: u.url,
          width: u.width,
          height: u.height,
          alt: ph.alt,
          sortOrder: i,
          isPrimary: i === 0,
          provider: "UPLOAD" as const,
          providerId: `upload:${u.id}`,
          license: "Uploaded by the property owner",
        };
      }),
    });
    await tx.priceHistory.create({ data: { listingId: l.id, date: now, event: "LISTED", price: p.price, source: "Owner" } });
    return l;
  });
  revalidateTag("listings");
  return listing;
}
