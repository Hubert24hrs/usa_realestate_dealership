import "server-only";
import type { Prisma } from "@prisma/client";
import { PROPERTY_TYPES, type PropertyTypeKey } from "@/lib/domain";
import type { SearchFilters } from "@/lib/search/filters";
import { placeWhere, type ResolvedPlace } from "./places";

const DAY = 86_400_000;

type Status = "ACTIVE" | "COMING_SOON" | "PENDING" | "SOLD" | "RENTED" | "OFF_MARKET" | "DRAFT";

function statusesForSale(f: SearchFilters): Status[] {
  if (f.comingSoon === true) return ["COMING_SOON"];
  const statuses: Status[] = ["ACTIVE"];
  if (f.comingSoon !== false) statuses.push("COMING_SOON");
  if (f.includePending) statuses.push("PENDING");
  return statuses;
}

export function modeWhere(f: SearchFilters, now: Date): Prisma.ListingWhereInput {
  switch (f.mode) {
    case "buy":
      return { category: "RESIDENTIAL", transactionType: "SALE", status: { in: statusesForSale(f) } };
    case "new":
      return { category: "RESIDENTIAL", transactionType: "SALE", isNewConstruction: true, status: { in: statusesForSale(f) } };
    case "sold":
      return {
        category: "RESIDENTIAL",
        status: "SOLD",
        ...(f.soldWithinDays ? { soldDate: { gte: new Date(now.getTime() - f.soldWithinDays * DAY) } } : {}),
      };
    case "rent":
      return { category: "RENTAL", transactionType: "RENT", status: "ACTIVE" };
    case "commercial":
      return {
        category: "COMMERCIAL",
        status: { in: ["ACTIVE", "COMING_SOON"] },
        ...(f.transaction === "lease" ? { transactionType: "LEASE" } : f.transaction === "sale" ? { transactionType: "SALE" } : {}),
      };
    case "land":
      return { category: "LAND", status: { in: ["ACTIVE", "COMING_SOON"] } };
  }
}

function rangeWhere(range: { min?: number; max?: number } | undefined) {
  if (!range || (range.min == null && range.max == null)) return undefined;
  return { ...(range.min != null ? { gte: range.min } : {}), ...(range.max != null ? { lte: range.max } : {}) };
}

/** Build the Prisma where clause for every non-spatial filter. */
export function buildWhere(f: SearchFilters, place: ResolvedPlace | null, now = new Date()): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [modeWhere(f, now)];
  if (place && !f.bounds && !f.polygon) and.push(placeWhere(place));

  if (f.q && !place) {
    const q = f.q.trim();
    and.push({
      OR: [
        { city: { contains: q, mode: "insensitive" } },
        { zip: { startsWith: q } },
        { streetAddress: { contains: q, mode: "insensitive" } },
        { mlsNumber: { contains: q, mode: "insensitive" } },
        { communityName: { contains: q, mode: "insensitive" } },
        { neighborhood: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  if (f.bounds && !f.polygon) {
    const [w, s, e, n] = f.bounds;
    and.push({ lat: { gte: s, lte: n }, lng: { gte: w, lte: e } });
  }

  if (f.price && (f.price.min != null || f.price.max != null)) {
    if (f.mode === "rent") {
      // Communities list a min–max rent range; match when ranges overlap.
      and.push({
        ...(f.price.max != null ? { price: { lte: f.price.max } } : {}),
        ...(f.price.min != null ? { OR: [{ priceMax: { gte: f.price.min } }, { priceMax: null, price: { gte: f.price.min } }] } : {}),
      });
    } else {
      and.push({ price: rangeWhere(f.price) });
    }
  }

  if (f.bedsMin != null && f.bedsMin > 0) {
    and.push({ OR: [{ beds: { gte: f.bedsMin } }, { isCommunity: true, units: { some: { beds: { gte: f.bedsMin }, isAvailable: true } } }] });
  }
  if (f.bathsMin != null && f.bathsMin > 0) and.push({ OR: [{ baths: { gte: f.bathsMin } }, { isCommunity: true, units: { some: { baths: { gte: f.bathsMin } } } }] });

  const types = (f.homeTypes ?? []).filter((t): t is PropertyTypeKey => (PROPERTY_TYPES as readonly string[]).includes(t));
  if (types.length) and.push({ propertyType: { in: types } });

  const sqft = rangeWhere(f.sqft);
  if (sqft) and.push({ sqft });
  const lot = rangeWhere(f.lotSqft);
  if (lot) and.push({ lotSqft: lot });
  const year = rangeWhere(f.yearBuilt);
  if (year) and.push({ yearBuilt: year });
  const acres = rangeWhere(f.acres);
  if (acres) and.push({ lotAcres: acres });
  if (f.hoaMax != null) and.push({ OR: [{ hoaFee: null }, { hoaFee: { lte: f.hoaMax } }] });
  if (f.garageMin) and.push({ garageSpaces: { gte: f.garageMin } });
  if (f.singleStory) and.push({ stories: { lte: 1 } });
  if (f.pool) and.push({ hasPool: true });
  if (f.waterfront) and.push({ isWaterfront: true });
  if (f.view) and.push({ hasView: true });
  if (f.basement) and.push({ hasBasement: true });
  if (f.yard) and.push({ OR: [{ hasYard: true }, { exteriorFeatures: { hasSome: ["Fenced yard", "Garden beds", "Covered patio"] } }] });
  if (f.pets === "any") and.push({ petsAllowed: true });
  if (f.pets === "cats") and.push({ catsAllowed: true });
  if (f.pets === "dogs") and.push({ dogsAllowed: true });
  if (f.parking) and.push({ OR: [{ garageSpaces: { gte: 1 } }, { parkingSpaces: { gte: 1 } }] });
  if (f.daysOnMarketMax) and.push({ listDate: { gte: new Date(now.getTime() - f.daysOnMarketMax * DAY) } });
  if (f.openHouse) and.push({ openHouses: { some: { endsAt: { gte: now } } } });
  if (f.foreclosure) and.push({ isForeclosure: true });
  if (f.fsbo) and.push({ isFsbo: true });
  if (f.newConstruction && f.mode !== "new") and.push({ isNewConstruction: true });
  if (f.tour3d) and.push({ has3dTour: true });
  if (f.video) and.push({ hasVideo: true });
  if (f.luxury) and.push({ isLuxury: true });
  if (f.priceReduced) and.push({ priceReducedAt: { gte: new Date(now.getTime() - 120 * DAY) } });
  if (f.schoolRatingMin) and.push({ schools: { some: { school: { rating: { gte: f.schoolRatingMin } } } } });
  if (f.school) and.push({ schools: { some: { school: { slug: f.school } } } });
  if (f.capRateMin != null) and.push({ capRate: { gte: f.capRateMin } });
  if (f.landTypes?.length) and.push({ landTypes: { hasSome: f.landTypes } });
  if (f.activities?.length) and.push({ activities: { hasSome: f.activities } });
  if (f.water) and.push({ OR: [{ waterFeatures: { isEmpty: false } }, { isWaterfront: true }] });

  if (f.keywords) {
    for (const word of f.keywords.split(/\s+/).filter((w) => w.length > 1).slice(0, 6)) {
      and.push({
        OR: [
          { description: { contains: word, mode: "insensitive" } },
          { headline: { contains: word, mode: "insensitive" } },
          { communityName: { contains: word, mode: "insensitive" } },
        ],
      });
    }
  }
  return { AND: and };
}

export function buildOrderBy(f: SearchFilters): Prisma.ListingOrderByWithRelationInput[] {
  const tail: Prisma.ListingOrderByWithRelationInput[] = [{ id: "asc" }];
  switch (f.sort) {
    case "newest":
      return [{ listDate: "desc" }, ...tail];
    case "price-asc":
      return [{ price: "asc" }, ...tail];
    case "price-desc":
      return [{ price: "desc" }, ...tail];
    case "beds":
      return [{ beds: { sort: "desc", nulls: "last" } }, ...tail];
    case "sqft":
      return [{ sqft: { sort: "desc", nulls: "last" } }, ...tail];
    case "ppsf":
      return [{ pricePerSqft: { sort: "asc", nulls: "last" } }, ...tail];
    case "lot":
      return [{ lotSqft: { sort: "desc", nulls: "last" } }, ...tail];
    case "reduced":
      return [{ priceReducedAt: { sort: "desc", nulls: "last" } }, ...tail];
    case "sold-recent":
      return [{ soldDate: { sort: "desc", nulls: "last" } }, ...tail];
    case "acres":
      return [{ lotAcres: { sort: "desc", nulls: "last" } }, ...tail];
    case "cap-rate":
      return [{ capRate: { sort: "desc", nulls: "last" } }, ...tail];
    default:
      return f.mode === "sold" ? [{ soldDate: { sort: "desc", nulls: "last" } }, ...tail] : [{ isFeatured: "desc" }, { listDate: "desc" }, ...tail];
  }
}
