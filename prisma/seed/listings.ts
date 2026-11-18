/**
 * Deterministic demo listing generator. `buildListingSpecs()` is also used by
 * scripts/media-fetch.ts to compute how many photos each room pool needs.
 */
import type { ListingCategoryKey, ListingStatusKey, PropertyTypeKey, TransactionTypeKey } from "../../src/lib/domain";
import { Rng, clamp, roundTo } from "../../src/lib/random";
import { jitterPoint } from "../../src/lib/geo";
import { slugify } from "../../src/lib/format";
import { CITIES, ZIP_BASE, citySlug, type CitySeed, type NeighborhoodSeed } from "./geo-data";
import {
  HOUSE_STYLES,
  KITCHEN_FEATURES,
  LIVING_FEATURES,
  OUTDOOR_FEATURES,
  PRIMARY_FEATURES,
  RURAL_ROADS,
  STREET_ROOTS,
  STREET_SUFFIXES,
  STYLE_WORDS,
} from "./names";

export interface ListingSpec {
  key: string;
  citySlug: string;
  hood: number;
  category: ListingCategoryKey;
  transactionType: TransactionTypeKey;
  status: ListingStatusKey;
  propertyType: PropertyTypeKey;
  luxury?: boolean;
  newConstruction?: boolean;
  foreclosure?: boolean;
  fsbo?: boolean;
  community?: boolean;
  variant?: string;
}

const CONDO_HEAVY = new Set(["miami-fl", "chicago-il", "seattle-wa", "san-diego-ca"]);

export function buildListingSpecs(): ListingSpec[] {
  const specs: Omit<ListingSpec, "key">[] = [];
  const urban = CITIES.filter((c) => !c.rural && !["asheville-nc", "franklin-tn"].includes(citySlug(c)));

  for (const city of urban) {
    const slug = citySlug(city);
    const n = city.neighborhoods.length;
    const condo = CONDO_HEAVY.has(slug);
    const base = { citySlug: slug, category: "RESIDENTIAL" as const, transactionType: "SALE" as const };
    specs.push({ ...base, hood: 0, status: "ACTIVE", propertyType: "SINGLE_FAMILY" });
    specs.push({ ...base, hood: 1 % n, status: "ACTIVE", propertyType: condo ? "CONDO" : "TOWNHOUSE" });
    specs.push({ ...base, hood: 2 % n, status: slug === "charlotte-nc" || slug === "seattle-wa" ? "PENDING" : "ACTIVE", propertyType: condo ? "CONDO" : "SINGLE_FAMILY" });
    specs.push({ ...base, hood: 3 % n, status: "SOLD", propertyType: "SINGLE_FAMILY" });
    specs.push({ ...base, hood: 1 % n, status: "SOLD", propertyType: condo ? "CONDO" : "TOWNHOUSE" });
    specs.push({
      citySlug: slug,
      hood: (n - 1) % n,
      category: "RENTAL",
      transactionType: "RENT",
      status: "ACTIVE",
      propertyType: condo ? "CONDO" : "SINGLE_FAMILY",
    });
  }

  const sale = (citySlug: string, hood: number, extra: Partial<ListingSpec>) =>
    specs.push({ citySlug, hood, category: "RESIDENTIAL", transactionType: "SALE", status: "ACTIVE", propertyType: "SINGLE_FAMILY", ...extra });
  const community = (citySlug: string, hood: number) =>
    specs.push({ citySlug, hood, category: "RENTAL", transactionType: "RENT", status: "ACTIVE", propertyType: "APARTMENT", community: true });
  const commercial = (citySlug: string, hood: number, propertyType: PropertyTypeKey, variant: string, transactionType: TransactionTypeKey) =>
    specs.push({ citySlug, hood, category: "COMMERCIAL", transactionType, status: "ACTIVE", propertyType, variant });

  // Austin
  sale("austin-tx", 2, { newConstruction: true });
  sale("austin-tx", 4, { fsbo: true });
  community("austin-tx", 2);
  commercial("austin-tx", 4, "OFFICE", "office", "LEASE");
  // Denver
  sale("denver-co", 0, { status: "COMING_SOON" });
  sale("denver-co", 3, { newConstruction: true, propertyType: "TOWNHOUSE" });
  community("denver-co", 3);
  commercial("denver-co", 3, "RETAIL", "retail", "SALE");
  // Nashville
  sale("nashville-tn", 0, { newConstruction: true });
  community("nashville-tn", 2);
  commercial("nashville-tn", 2, "MIXED_USE", "mixed", "SALE");
  // Scottsdale
  sale("scottsdale-az", 2, { luxury: true });
  sale("scottsdale-az", 1, { newConstruction: true });
  // Charlotte
  community("charlotte-nc", 1);
  commercial("charlotte-nc", 3, "INDUSTRIAL", "industrial", "LEASE");
  sale("charlotte-nc", 3, { foreclosure: true });
  // Raleigh
  sale("raleigh-nc", 1, { newConstruction: true });
  // Seattle
  commercial("seattle-wa", 2, "OFFICE", "office", "SALE");
  sale("seattle-wa", 1, { status: "COMING_SOON", propertyType: "TOWNHOUSE" });
  // Miami
  sale("miami-fl", 0, { luxury: true, propertyType: "CONDO" });
  commercial("miami-fl", 3, "RETAIL", "retail", "LEASE");
  // San Diego
  sale("san-diego-ca", 1, { luxury: true });
  commercial("san-diego-ca", 3, "MIXED_USE", "mixed", "SALE");
  // Atlanta
  community("atlanta-ga", 0);
  commercial("atlanta-ga", 2, "INDUSTRIAL", "industrial", "SALE");
  sale("atlanta-ga", 1, { fsbo: true });
  // Chicago
  commercial("chicago-il", 2, "MULTI_FAMILY", "multifamily", "SALE");
  sale("chicago-il", 2, { foreclosure: true, propertyType: "MULTI_FAMILY" });
  sale("chicago-il", 0, { status: "SOLD", propertyType: "CONDO" });

  // Land & ranch
  const land = (citySlug: string, hood: number, propertyType: PropertyTypeKey, variant: string) =>
    specs.push({ citySlug, hood, category: "LAND", transactionType: "SALE", status: "ACTIVE", propertyType, variant });
  land("fredericksburg-tx", 0, "FARM_RANCH", "ranch");
  land("fredericksburg-tx", 0, "LAND", "hunting");
  land("fredericksburg-tx", 0, "LAND", "recreational");
  land("bozeman-mt", 0, "FARM_RANCH", "ranch");
  land("bozeman-mt", 0, "LAND", "timber");
  land("bozeman-mt", 0, "LAND", "recreational");
  land("asheville-nc", 1, "LAND", "timber");
  land("asheville-nc", 1, "LAND", "lot");
  land("franklin-tn", 1, "FARM_RANCH", "farm");
  land("franklin-tn", 1, "LAND", "equestrian");

  const counters = new Map<string, number>();
  return specs.map((s) => {
    const i = (counters.get(s.citySlug) ?? 0) + 1;
    counters.set(s.citySlug, i);
    return { ...s, key: `${s.citySlug}-${String(i).padStart(2, "0")}` };
  });
}

// ───────────────────────── materialisation ─────────────────────────

export interface MaterialisedListing {
  data: Record<string, unknown>;
  priceHistory: Array<{ date: Date; event: string; price: number; source: string }>;
  taxHistory: Array<{ year: number; taxPaid: number; assessedValue: number; landValue: number; improvementValue: number }>;
  openHouses: Array<{ startsAt: Date; endsAt: Date; type: "IN_PERSON" | "VIRTUAL" }>;
  units: Array<Record<string, unknown>>;
  spaces: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  floorPlanParams: Record<string, string | number | boolean>;
}

const DAY = 86_400_000;
const BUILDERS = ["Cedarline Homes", "Northpoint Builders", "Brightwater Homes", "Stonefield Residential", "Lumen Homebuilders"];
const COMMUNITY_PREFIX = ["The", "Residences at", "The Lofts at", "Parkside at"];
const INTERIOR = ["Hardwood floors", "Walk-in closet", "Kitchen island", "Recessed lighting", "Open floor plan", "Smart thermostat", "Built-in shelving", "Pantry", "Laundry room", "Vaulted ceilings", "Home office", "Skylights"];
const EXTERIOR = ["Covered patio", "Fenced yard", "Deck", "Sprinkler system", "Mature trees", "Outdoor kitchen", "Garden beds", "Front porch", "EV charger", "Solar panels"];
const APPLIANCES = ["Refrigerator", "Dishwasher", "Gas range", "Microwave", "Washer", "Dryer", "Wine fridge", "Double oven"];
const COMMUNITY = ["Pool", "Fitness center", "Package lockers", "Dog park", "Coworking lounge", "EV charging", "Rooftop deck", "Controlled access", "Bike storage", "Clubhouse"];

function hoodFor(city: CitySeed, index: number): NeighborhoodSeed {
  return city.neighborhoods[index % city.neighborhoods.length]!;
}

function riskProfile(slug: string, r: Rng) {
  const coastal = ["miami-fl", "san-diego-ca", "seattle-wa"].includes(slug);
  const hot = ["scottsdale-az", "austin-tx", "miami-fl", "fredericksburg-tx"].includes(slug);
  const fire = ["scottsdale-az", "san-diego-ca", "bozeman-mt", "asheville-nc", "fredericksburg-tx"].includes(slug);
  return {
    floodRisk: slug === "miami-fl" ? r.int(6, 9) : coastal ? r.int(3, 6) : r.int(1, 4),
    fireRisk: fire ? r.int(4, 8) : r.int(1, 3),
    heatRisk: hot ? r.int(7, 10) : r.int(2, 6),
    windRisk: slug === "miami-fl" ? r.int(7, 9) : r.int(2, 5),
    airQuality: r.int(1, 5),
  };
}

function streetAddress(r: Rng, rural: boolean): string {
  if (rural) return `${r.int(1000, 9800)} ${r.pick(STREET_ROOTS)} ${r.pick(RURAL_ROADS)}`;
  return `${r.int(100, 9899)} ${r.pick(STREET_ROOTS)} ${r.pick(STREET_SUFFIXES)}`;
}

export function materialise(spec: ListingSpec, index: number, now: Date): MaterialisedListing {
  const r = new Rng(spec.key);
  const city = CITIES.find((c) => citySlug(c) === spec.citySlug)!;
  const hood = hoodFor(city, spec.hood);
  const zips = ZIP_BASE[spec.citySlug] ?? ["00000"];
  const zip = zips[spec.hood % zips.length]!;
  const rural = Boolean(city.rural) || spec.category === "LAND";
  const point = jitterPoint({ lat: hood.lat, lng: hood.lng }, (hood.r ?? 0.008) * (spec.category === "LAND" ? 1 : 0.9), r);
  const street = streetAddress(r, rural);
  const risks = riskProfile(spec.citySlug, r);
  const priceHistory: MaterialisedListing["priceHistory"] = [];
  const openHouses: MaterialisedListing["openHouses"] = [];
  const units: MaterialisedListing["units"] = [];
  const spaces: MaterialisedListing["spaces"] = [];
  const documents: MaterialisedListing["documents"] = [];
  const isSold = spec.status === "SOLD";

  const daysListed = spec.status === "COMING_SOON" ? r.int(0, 6) : r.int(1, 110);
  let listDate = new Date(now.getTime() - daysListed * DAY);
  let soldDate: Date | null = null;
  if (isSold) {
    soldDate = new Date(now.getTime() - r.int(14, 320) * DAY);
    listDate = new Date(soldDate.getTime() - r.int(18, 85) * DAY);
  }

  const data: Record<string, unknown> = {
    category: spec.category,
    transactionType: spec.transactionType,
    status: spec.status,
    propertyType: spec.propertyType,
    source: spec.fsbo ? "FSBO" : "SEED",
    isDemo: true,
    streetAddress: street,
    city: city.name,
    state: city.state,
    zip,
    county: `${city.county} County`,
    lat: point.lat,
    lng: point.lng,
    listDate,
    soldDate,
    isNewConstruction: Boolean(spec.newConstruction),
    isForeclosure: Boolean(spec.foreclosure),
    isFsbo: Boolean(spec.fsbo),
    isLuxury: Boolean(spec.luxury),
    isCommunity: Boolean(spec.community),
    walkScore: clamp(hood.walk + r.int(-8, 6), 0, 100),
    transitScore: clamp(hood.transit + r.int(-8, 6), 0, 100),
    bikeScore: clamp(hood.bike + r.int(-8, 6), 0, 100),
    crimeIndex: r.int(12, 68),
    noiseLevel: clamp(Math.round(hood.walk * 0.6 + r.int(-10, 15)), 5, 95),
    ...risks,
    mlsNumber: `DEMO-${(240000 + index * 137).toString()}`,
    attribution: "Demo MLS · data illustrative",
  };

  let floorPlanParams: MaterialisedListing["floorPlanParams"] = {};
  let headline = "";
  let description = "";
  const style = r.pick(STYLE_WORDS);

  if (spec.category === "RESIDENTIAL" || (spec.category === "RENTAL" && !spec.community)) {
    const t = spec.propertyType;
    const luxury = Boolean(spec.luxury);
    const beds = luxury ? r.int(4, 6) : t === "CONDO" ? r.int(1, 3) : t === "TOWNHOUSE" ? r.int(2, 4) : t === "MULTI_FAMILY" ? r.int(4, 6) : r.int(2, 5);
    const fullBaths = Math.max(1, Math.min(beds, luxury ? beds : beds - r.int(0, 1)));
    const halfBaths = r.chance(t === "CONDO" ? 0.2 : 0.55) ? 1 : 0;
    const sqftBase = t === "CONDO" ? 480 + beds * 380 : t === "TOWNHOUSE" ? 600 + beds * 420 : t === "MULTI_FAMILY" ? 800 + beds * 480 : 700 + beds * 480;
    const sqft = roundTo(sqftBase * r.float(0.88, 1.2) * (luxury ? 1.9 : 1), 10);
    const typeFactor = t === "CONDO" ? 0.64 : t === "TOWNHOUSE" ? 0.82 : t === "MULTI_FAMILY" ? 1.25 : 1;
    const typical = t === "CONDO" ? 1100 : t === "TOWNHOUSE" ? 1650 : 2050;
    let price = city.medianHome * hood.premium * typeFactor * Math.pow(sqft / typical, 0.78) * r.float(0.86, 1.14) * (luxury ? 1.7 : 1);
    if (spec.foreclosure) price *= 0.82;
    if (spec.newConstruction) price *= 1.08;
    price = roundTo(price, price > 1_000_000 ? 25_000 : 5_000);
    const yearBuilt = spec.newConstruction ? 2026 : t === "CONDO" ? r.int(1982, 2024) : r.int(1922, 2023);
    const lotSqft = t === "CONDO" ? null : t === "TOWNHOUSE" ? r.int(1600, 3200) : luxury ? r.int(14000, 45000) : r.int(4200, 12500);
    const hasPool = luxury || (["scottsdale-az", "miami-fl", "austin-tx", "san-diego-ca"].includes(spec.citySlug) && r.chance(0.35));
    const stories = t === "CONDO" ? 1 : t === "TOWNHOUSE" ? r.int(2, 3) : luxury ? r.int(2, 3) : r.int(1, 2);
    const garage = t === "CONDO" ? 0 : t === "TOWNHOUSE" ? r.int(1, 2) : r.int(1, 3);
    const hoa = t === "CONDO" ? roundTo(r.int(260, 900) * (luxury ? 2 : 1), 5) : t === "TOWNHOUSE" ? roundTo(r.int(120, 360), 5) : r.chance(0.35) ? roundTo(r.int(30, 160), 5) : null;
    const houseStyle = r.pick(HOUSE_STYLES);
    const amenityHint = r.sample(hood.highlights, 2);

    Object.assign(data, {
      beds,
      baths: fullBaths + halfBaths * 0.5,
      fullBaths,
      halfBaths,
      sqft,
      lotSqft,
      lotAcres: lotSqft ? Number((lotSqft / 43560).toFixed(2)) : null,
      yearBuilt,
      stories,
      garageSpaces: garage,
      parkingSpaces: t === "CONDO" ? r.int(1, 2) : garage + r.int(0, 2),
      parkingType: t === "CONDO" ? "Assigned garage" : garage > 0 ? "Attached garage" : "Driveway",
      hoaFee: hoa,
      hasPool,
      isWaterfront: (luxury && ["miami-fl", "seattle-wa"].includes(spec.citySlug)) || r.chance(0.05),
      hasView: luxury || t === "CONDO" ? r.chance(0.7) : r.chance(0.15),
      hasBasement: ["denver-co", "chicago-il", "seattle-wa"].includes(spec.citySlug) && t !== "CONDO" && r.chance(0.6),
      hasYard: t !== "CONDO",
      hasFireplace: r.chance(0.45),
      heating: r.pick(["Forced air, gas", "Heat pump", "Radiant", "Forced air, electric"]),
      cooling: spec.citySlug === "seattle-wa" && r.chance(0.5) ? "None" : "Central air",
      flooring: r.sample(["Hardwood", "Tile", "Carpet", "Luxury vinyl plank", "Concrete"], 2),
      appliances: r.sample(APPLIANCES, r.int(4, 7)),
      interiorFeatures: r.sample(INTERIOR, r.int(4, 7)),
      exteriorFeatures: t === "CONDO" ? r.sample(["Balcony", "Storage unit", "Bike storage"], 2) : r.sample(EXTERIOR, r.int(3, 5)),
      communityFeatures: t === "CONDO" || t === "TOWNHOUSE" ? r.sample(COMMUNITY, r.int(3, 6)) : [],
      utilities: ["Public water", "Public sewer", "Natural gas", "Electricity"],
      builderName: spec.newConstruction ? r.pick(BUILDERS) : null,
    });

    if (spec.category === "RENTAL") {
      const rent = roundTo(city.medianRent * hood.premium * (0.6 + beds * 0.24) * r.float(0.9, 1.12) * (t === "CONDO" ? 0.95 : 1.1), 25);
      price = rent;
      const pets = r.chance(0.7);
      const dogs = pets && r.chance(0.75);
      const appFee = r.pick([40, 45, 50, 55, 65]);
      Object.assign(data, {
        price: rent,
        availableDate: new Date(now.getTime() + r.int(0, 40) * DAY),
        leaseTermMonths: r.pick([12, 12, 12, 6, 18]),
        securityDeposit: roundTo(rent * r.float(0.5, 1), 50),
        applicationFee: appFee,
        petsAllowed: pets,
        catsAllowed: pets,
        dogsAllowed: dogs,
        petDeposit: pets ? r.pick([250, 300, 400, 500]) : null,
        petRent: pets ? r.pick([25, 35, 40, 50]) : null,
        petPolicy: pets
          ? `${dogs ? "Cats and dogs" : "Cats"} welcome, up to 2 pets. Assistance animals are not pets and are never charged pet fees.`
          : "No pets. Assistance animals are not pets and are welcome with a reasonable-accommodation request.",
        fees: [
          { label: "Application fee", amount: appFee, frequency: "one-time" },
          { label: "Admin fee", amount: r.pick([0, 100, 150, 200]), frequency: "one-time" },
          { label: "Utilities (est.)", amount: r.int(120, 260), frequency: "monthly" },
        ],
        laundry: t === "CONDO" ? r.pick(["In unit", "On site"]) : "In unit",
        furnished: r.chance(0.12),
        utilitiesIncluded: r.sample(["Water", "Trash", "Sewer", "Internet"], r.int(0, 2)),
        rentalAmenities: r.sample(["In-unit laundry", "Dishwasher", "Central air", "Private yard", "Garage", "Balcony", "Storage"], 4),
        rentEstimate: rent,
      });
    } else {
      data.price = isSold ? roundTo(price * r.float(0.97, 1.0), 1000) : price;
    }

    const neighborhoodBlurb = `${hood.name} in ${city.name}`;
    headline =
      spec.category === "RENTAL"
        ? `${style[0]!.toUpperCase()}${style.slice(1)} ${beds}-bed ${t === "CONDO" ? "condo" : "home"} for rent in ${hood.name}`
        : spec.newConstruction
          ? `New ${houseStyle} build by ${data.builderName as string} in ${hood.name}`
          : luxury
            ? `${houseStyle[0]!.toUpperCase()}${houseStyle.slice(1)} estate with ${hasPool ? "pool and " : ""}resort-style living`
            : `${style[0]!.toUpperCase()}${style.slice(1)} ${t === "CONDO" ? "condo" : t === "TOWNHOUSE" ? "townhome" : houseStyle} near ${amenityHint[0] ?? hood.name}`;
    description = [
      `${style[0]!.toUpperCase()}${style.slice(1)} ${t === "CONDO" ? "condominium" : t === "TOWNHOUSE" ? "townhome" : `${houseStyle} home`} in ${neighborhoodBlurb} with ${beds} bedrooms, ${data.baths as number} baths and ${sqft.toLocaleString("en-US")} square feet.`,
      `The main living area pairs a ${r.pick(KITCHEN_FEATURES)} with a ${r.pick(LIVING_FEATURES)}, and the primary suite offers ${r.pick(PRIMARY_FEATURES)}.`,
      t === "CONDO"
        ? `Building amenities include ${(data.communityFeatures as string[]).slice(0, 3).join(", ").toLowerCase() || "secure entry and storage"}.`
        : `Outside you'll find ${r.pick(OUTDOOR_FEATURES)}${hasPool ? " plus a private pool" : ""}.`,
      `Nearby: ${hood.highlights.join(", ").toLowerCase()}.`,
      spec.newConstruction ? `Builder warranty included; finishes and completion timing per builder.` : "",
      spec.foreclosure ? `Bank-owned property sold as-is. Buyer to verify all information; inspections welcome.` : "",
      spec.fsbo ? `Offered For Sale By Owner — contact the owner directly through CITI VIEW.` : "",
      `This is a demo listing created for the CITI VIEW platform; all details are illustrative.`,
    ]
      .filter(Boolean)
      .join(" ");

    floorPlanParams = { b: beds, ba: data.baths as number, sf: sqft, k: t === "CONDO" ? "condo" : "home", g: garage > 0 };
  }

  if (spec.community) {
    const beds = [0, 1, 1, 2, 2, 3];
    const plans = [
      { name: "The Studio", beds: 0, baths: 1, sqft: [480, 560] },
      { name: "The Alder", beds: 1, baths: 1, sqft: [640, 760] },
      { name: "The Birch", beds: 1, baths: 1, sqft: [720, 840] },
      { name: "The Cedar", beds: 2, baths: 2, sqft: [980, 1120] },
      { name: "The Dogwood", beds: 2, baths: 2, sqft: [1080, 1220] },
      { name: "The Elm", beds: 3, baths: 2, sqft: [1260, 1420] },
    ];
    const unitCount = r.int(9, 14);
    for (let u = 0; u < unitCount; u++) {
      const plan = plans[u % plans.length]!;
      const sqft = r.int(plan.sqft[0]!, plan.sqft[1]!);
      const rent = roundTo(city.medianRent * hood.premium * (0.72 + plan.beds * 0.26) * r.float(0.92, 1.1), 5);
      units.push({
        unitNumber: `${r.int(1, 5)}${String(r.int(1, 30)).padStart(2, "0")}`,
        floorPlan: plan.name,
        beds: plan.beds,
        baths: plan.baths,
        sqft,
        rent,
        deposit: roundTo(rent * 0.5, 50),
        availableDate: new Date(now.getTime() + r.int(-5, 60) * DAY),
        isAvailable: r.chance(0.85),
        floor: r.int(1, 5),
        features: r.sample(["Balcony", "Corner unit", "Walk-in closet", "Island kitchen", "Courtyard view", "Upgraded finishes"], 2),
      });
    }
    const rents = units.map((u) => u.rent as number);
    const sqfts = units.map((u) => u.sqft as number);
    const name = `${r.pick(COMMUNITY_PREFIX)} ${r.pick(STREET_ROOTS)}${r.chance(0.5) ? "" : ` ${hood.name}`}`.replace("The The", "The");
    Object.assign(data, {
      communityName: name,
      price: Math.min(...rents),
      priceMax: Math.max(...rents),
      beds: Math.min(...beds),
      baths: 1,
      sqft: Math.min(...sqfts),
      yearBuilt: r.int(2012, 2025),
      stories: r.int(4, 7),
      petsAllowed: true,
      catsAllowed: true,
      dogsAllowed: true,
      petDeposit: 350,
      petRent: r.pick([25, 35, 45]),
      petPolicy: "Up to 2 pets per home; breed and weight limits per community insurance. Assistance animals are not pets and are never charged pet fees or rent.",
      fees: [
        { label: "Application fee", amount: 50, frequency: "one-time" },
        { label: "Admin fee", amount: 150, frequency: "one-time" },
        { label: "Garage parking", amount: r.pick([50, 75, 100]), frequency: "monthly" },
        { label: "Trash & pest", amount: r.pick([20, 25, 35]), frequency: "monthly" },
      ],
      moveInSpecial: r.pick(["6 weeks free on select homes", "$750 off first month", "Waived admin fee this month", "Free parking for 6 months"]),
      applicationFee: 50,
      securityDeposit: 500,
      leaseTermMonths: 12,
      availableDate: new Date(now.getTime() + r.int(0, 21) * DAY),
      laundry: "In unit",
      rentalAmenities: r.sample(COMMUNITY, 7),
      communityFeatures: r.sample(COMMUNITY, 6),
      hasPool: true,
      parkingType: "Garage parking available",
      cooling: "Central air",
      heating: "Forced air, electric",
      appliances: ["Refrigerator", "Dishwasher", "Microwave", "Washer", "Dryer"],
      interiorFeatures: r.sample(INTERIOR, 5),
      utilities: ["Electricity", "Water", "Sewer"],
      utilitiesIncluded: ["Trash"],
    });
    headline = `${name}: ${hood.name} apartments with ${(data.rentalAmenities as string[]).slice(0, 2).join(" & ").toLowerCase()}`;
    description = `${name} offers studio to three-bedroom apartments in ${hood.name}, ${city.name}. Homes feature ${r.pick(KITCHEN_FEATURES)}s, in-unit laundry and ${r.pick(["wide-plank floors", "oversized windows", "private balconies"])}. Residents enjoy ${(data.rentalAmenities as string[]).slice(0, 4).join(", ").toLowerCase()}. Professionally managed with online applications, e-sign leases and online rent payment. Demo community created for CITI VIEW; pricing and availability are illustrative.`;
    floorPlanParams = { b: 2, ba: 2, sf: 1080, k: "condo" };
  }

  if (spec.category === "COMMERCIAL") {
    const v = spec.variant ?? "office";
    const buildingSqft = v === "industrial" ? r.int(42000, 180000) : v === "multifamily" ? r.int(14000, 42000) : v === "retail" ? r.int(8000, 36000) : r.int(18000, 120000);
    const occupancy = Number(r.float(spec.transactionType === "LEASE" ? 60 : 82, 100).toFixed(1));
    const buildingClass = r.pick(["A", "A", "B", "B", "C"]);
    const isLease = spec.transactionType === "LEASE";
    const rateRange: [number, number] = v === "industrial" ? [9, 16] : v === "retail" ? [22, 48] : [28, 62];
    const leaseType = v === "office" ? r.pick(["Full Service", "Modified Gross"]) : "NNN";
    Object.assign(data, {
      buildingSqft,
      sqft: buildingSqft,
      lotAcres: Number(r.float(0.4, v === "industrial" ? 12 : 3.5).toFixed(2)),
      yearBuilt: r.int(1962, 2022),
      stories: v === "industrial" ? 1 : v === "retail" ? r.int(1, 2) : r.int(3, 14),
      buildingClass,
      zoning: v === "industrial" ? r.pick(["I-1 Light Industrial", "M-1"]) : v === "retail" ? r.pick(["C-2 General Commercial", "CS"]) : r.pick(["MU-2 Mixed Use", "CBD", "O-2 Office"]),
      occupancyPct: occupancy,
      parkingRatio: Number(r.float(1, 4.5).toFixed(1)),
      ceilingHeight: v === "industrial" ? r.int(24, 36) : r.int(9, 14),
      loadingDocks: v === "industrial" ? r.int(4, 22) : v === "retail" ? r.int(0, 2) : 0,
      tenancy: v === "industrial" && r.chance(0.5) ? "Single" : "Multiple",
      leaseType: isLease ? leaseType : null,
      parkingSpaces: Math.round((buildingSqft / 1000) * r.float(1, 4)),
    });
    if (isLease) {
      const suites = r.int(3, 6);
      let minMonthly = Infinity;
      let minRate = Infinity;
      let available = 0;
      for (let s = 0; s < suites; s++) {
        const sf = roundTo(r.int(v === "industrial" ? 8000 : 1200, v === "industrial" ? 42000 : 9800), 50);
        const rate = Number(r.float(rateRange[0], rateRange[1]).toFixed(2));
        available += sf;
        minRate = Math.min(minRate, rate);
        minMonthly = Math.min(minMonthly, Math.round((sf * rate) / 12));
        spaces.push({
          suite: v === "industrial" ? `Bay ${String.fromCharCode(65 + s)}` : `Suite ${r.int(1, 9)}${String(r.int(0, 20)).padStart(2, "0")}`,
          spaceUse: v === "industrial" ? r.pick(["Warehouse", "Flex", "Distribution"]) : v === "retail" ? "Retail" : "Office",
          sqft: sf,
          rate,
          rateType: "/SF/YR",
          leaseType,
          term: r.pick(["3–5 years", "3–10 years", "5–10 years", "Negotiable"]),
          availableDate: new Date(now.getTime() + r.int(0, 120) * DAY),
          condition: r.pick(["Full build-out", "Second-generation", "Shell", "Move-in ready"]),
          isAvailable: true,
        });
      }
      Object.assign(data, { price: minMonthly, leaseRate: minRate, availableSqft: available });
    } else {
      const capRate = Number(r.float(v === "multifamily" ? 5.2 : 5.8, v === "industrial" ? 7.4 : 8.2).toFixed(2));
      const ppsf = v === "industrial" ? r.int(110, 210) : v === "multifamily" ? r.int(230, 360) : v === "retail" ? r.int(220, 420) : r.int(240, 520);
      const price = roundTo(buildingSqft * ppsf * hood.premium * 0.9, 50_000);
      Object.assign(data, {
        price,
        capRate,
        noi: Math.round((price * capRate) / 100),
        pricePerSqft: Math.round(price / buildingSqft),
        ndaRequired: true,
        investmentHighlights: r.sample(
          [
            `${occupancy}% leased with staggered expirations`,
            "Below-market in-place rents with mark-to-market upside",
            "Corner location with strong traffic counts",
            "Recent roof and HVAC capital improvements",
            "Walkable to transit and dense residential",
            "Value-add opportunity via unit renovations",
            "Long-term credit tenant anchoring the asset",
          ],
          4,
        ),
      });
      documents.push(
        { name: "Offering Memorandum", kind: "OM", requiresNda: true, pages: r.int(28, 64), sizeKb: r.int(4200, 12800) },
        { name: "Rent Roll", kind: "RENT_ROLL", requiresNda: true, pages: r.int(2, 6), sizeKb: r.int(120, 480) },
        { name: "T-12 Operating Statement", kind: "FINANCIALS", requiresNda: true, pages: r.int(3, 8), sizeKb: r.int(150, 520) },
      );
    }
    documents.push(
      { name: "Floor Plans", kind: "FLOOR_PLAN", requiresNda: false, pages: r.int(2, 8), sizeKb: r.int(600, 2400) },
      { name: "Site Plan & Survey", kind: "SURVEY", requiresNda: false, pages: r.int(1, 3), sizeKb: r.int(300, 1400) },
    );
    const label = v === "multifamily" ? `${r.int(12, 48)}-unit multifamily` : v === "mixed" ? "mixed-use building" : v === "industrial" ? "industrial facility" : v === "retail" ? "retail center" : `Class ${buildingClass} office building`;
    headline = isLease ? `${label[0]!.toUpperCase()}${label.slice(1)} — space for lease in ${hood.name}` : `${label[0]!.toUpperCase()}${label.slice(1)} investment opportunity in ${hood.name}`;
    description = `${label[0]!.toUpperCase()}${label.slice(1)} totaling ${buildingSqft.toLocaleString("en-US")} SF in ${hood.name}, ${city.name}. ${
      isLease
        ? `Multiple suites available with flexible terms and ${data.leaseType as string} lease structures.`
        : `Offered at a ${(data.capRate as number).toFixed(2)}% cap rate on in-place NOI. Execute the NDA to access the offering memorandum, rent roll and financials.`
    } Zoned ${data.zoning as string}; ${data.parkingSpaces as number} parking spaces. Demo commercial listing created for CITI VIEW; figures are illustrative.`;
    floorPlanParams = { k: "commercial", sf: (data.availableSqft as number) ?? buildingSqft };
  }

  if (spec.category === "LAND") {
    const v = spec.variant ?? "recreational";
    const acresRange: Record<string, [number, number]> = {
      ranch: [140, 1100],
      hunting: [90, 520],
      recreational: [24, 160],
      timber: [70, 420],
      farm: [45, 260],
      lot: [0.6, 4.5],
      equestrian: [14, 70],
    };
    const [amin, amax] = acresRange[v] ?? [20, 200];
    const acres = Number(r.float(amin, amax).toFixed(v === "lot" ? 2 : 1));
    const ppaBase: Record<string, number> = { "fredericksburg-tx": 13500, "bozeman-mt": 15500, "asheville-nc": 24000, "franklin-tn": 52000 };
    const ppa = Math.round(((ppaBase[spec.citySlug] ?? 12000) * r.float(0.75, 1.3) * (acres < 50 ? 1.35 : 1)) / 100) * 100;
    const price = v === "lot" ? roundTo(r.int(95000, 260000), 5000) : roundTo(acres * ppa, 5000);
    const water = r.sample(["Seasonal creek", "Spring-fed pond", "River frontage", "Stock tank", "Well", "Year-round creek"], v === "lot" ? 0 : r.int(1, 3));
    const activitiesByVariant: Record<string, string[]> = {
      ranch: ["Hunting", "Horseback riding", "Fishing", "Off-roading"],
      hunting: ["Hunting", "Camping", "Off-roading", "Bird watching"],
      recreational: ["Camping", "Hiking", "Fishing", "Stargazing", "Boating"],
      timber: ["Hunting", "Hiking", "Camping"],
      farm: ["Horseback riding", "Bird watching"],
      lot: ["Hiking", "Stargazing"],
      equestrian: ["Horseback riding", "Hiking"],
    };
    const typesByVariant: Record<string, string[]> = {
      ranch: ["Ranch", "Hunting", "Recreational"],
      hunting: ["Hunting", "Recreational"],
      recreational: ["Recreational", "Waterfront"],
      timber: ["Timberland", "Hunting"],
      farm: ["Farm", "Ranch"],
      lot: ["Residential lot", "Undeveloped"],
      equestrian: ["Ranch", "Farm"],
    };
    Object.assign(data, {
      price,
      lotAcres: acres,
      lotSqft: Math.round(acres * 43560),
      pricePerAcre: Math.round(price / acres),
      landTypes: typesByVariant[v] ?? ["Recreational"],
      activities: r.sample(activitiesByVariant[v] ?? ["Hiking"], r.int(2, 4)),
      waterFeatures: water,
      hasWaterRights: spec.citySlug === "bozeman-mt" ? r.chance(0.8) : r.chance(0.2),
      hasTimber: v === "timber" || r.chance(0.3),
      timberDescription: v === "timber" ? r.pick(["Mature mixed hardwoods; last harvested ~20 years ago", "Lodgepole and Douglas fir stands", "Oak-hickory forest with merchantable timber"]) : null,
      soilType: r.pick(["Clay loam", "Sandy loam", "Rocky limestone", "Silt loam", "Gravelly loam"]),
      topography: r.pick(["Rolling", "Gently sloping", "Level to rolling", "Steep wooded slopes", "Hilltop with valley views"]),
      roadFrontageFt: r.int(250, 3200),
      hasMineralRights: spec.citySlug === "fredericksburg-tx" ? r.chance(0.5) : false,
      irrigation: v === "farm" ? r.pick(["Center pivot", "Flood irrigation", "None"]) : null,
      fencing: v === "lot" ? null : r.pick(["Perimeter fenced", "Cross-fenced pasture", "High-fenced perimeter", "Partially fenced"]),
      improvements: v === "lot" ? [] : r.sample(["Barn", "Water well", "Cabin", "Equipment shed", "Hunting blinds", "Corrals", "Ranch house"], r.int(1, 4)),
      utilities: r.sample(["Electric at road", "Water well", "Septic required", "Fiber internet nearby", "Propane"], 2),
      countyData: {
        apn: `${city.county.slice(0, 2).toUpperCase()}-${r.int(10000, 99999)}-${r.int(100, 999)}`,
        taxDistrict: `${city.county} County`,
        floodZone: water.length && r.chance(0.4) ? "Zone A (partial)" : "Zone X",
        zoning: v === "lot" ? "R-1 Residential" : "Agricultural",
        agExemption: v !== "lot" && r.chance(0.7),
        annualTax: Math.round(price * city.taxRate * (v === "lot" ? 1 : 0.2)),
      },
      yearBuilt: null,
    });
    const label = v === "ranch" ? "working ranch" : v === "hunting" ? "hunting property" : v === "timber" ? "timberland tract" : v === "farm" ? "farm" : v === "lot" ? "homesite" : v === "equestrian" ? "equestrian property" : "recreational acreage";
    headline = `${acres.toLocaleString("en-US")} acres — ${label} near ${city.name}`;
    description = `${acres.toLocaleString("en-US")}-acre ${label} in ${city.county} County with ${(data.topography as string).toLowerCase()} terrain${water.length ? ` and ${water.join(", ").toLowerCase()}` : ""}. ${
      (data.improvements as string[]).length ? `Improvements include ${(data.improvements as string[]).join(", ").toLowerCase()}. ` : ""
    }Ideal for ${(data.activities as string[]).join(", ").toLowerCase()}. ${data.roadFrontageFt as number} ft of road frontage. Demo land listing created for CITI VIEW; acreage, boundaries and county data are illustrative.`;
    floorPlanParams = { a: acres };
  }

  // Price drops, open houses, history (all non-rental, non-lease sale listings)
  const price = data.price as number;
  const isSale = spec.transactionType === "SALE";
  if (isSale && spec.status === "ACTIVE" && r.chance(0.3)) {
    const reduction = roundTo(price * r.float(0.02, 0.07), price > 1_000_000 ? 25_000 : 5_000);
    const reducedAt = new Date(listDate.getTime() + Math.max(1, Math.floor(daysListed * r.float(0.3, 0.8))) * DAY);
    Object.assign(data, { originalPrice: price + reduction, priceReduction: reduction, priceReducedAt: reducedAt });
    priceHistory.push({ date: listDate, event: "LISTED", price: price + reduction, source: "Demo MLS" });
    priceHistory.push({ date: reducedAt, event: "PRICE_CHANGE", price, source: "Demo MLS" });
  } else {
    data.originalPrice = price;
    priceHistory.push({ date: listDate, event: spec.transactionType === "SALE" ? "LISTED" : "LISTED", price, source: "Demo MLS" });
  }
  if (spec.status === "PENDING") {
    priceHistory.push({ date: new Date(now.getTime() - r.int(2, 10) * DAY), event: "PENDING", price, source: "Demo MLS" });
  }
  if (isSold && soldDate) {
    const soldPrice = roundTo(price * r.float(0.96, 1.05), 1000);
    data.soldPrice = soldPrice;
    priceHistory.push({ date: new Date(soldDate.getTime() - r.int(10, 30) * DAY), event: "PENDING", price, source: "Demo MLS" });
    priceHistory.push({ date: soldDate, event: "SOLD", price: soldPrice, source: "Demo public record" });
  }
  if (spec.category === "RESIDENTIAL" && !spec.newConstruction) {
    const yearsAgo = r.int(4, 14);
    const prior = roundTo(price / Math.pow(1.045, yearsAgo), 1000);
    priceHistory.unshift({ date: new Date(now.getTime() - yearsAgo * 365 * DAY - r.int(0, 200) * DAY), event: "SOLD", price: prior, source: "Demo public record" });
  }
  if (isSale && (spec.status === "ACTIVE" || spec.status === "COMING_SOON") && spec.category === "RESIDENTIAL" && r.chance(0.42)) {
    const nextSat = new Date(now);
    nextSat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    for (let k = 0; k < r.int(1, 2); k++) {
      const start = new Date(nextSat.getTime() + k * DAY + (r.int(10, 14) * 60 + r.pick([0, 30])) * 60_000);
      start.setHours(r.int(10, 14), r.pick([0, 30]), 0, 0);
      openHouses.push({ startsAt: start, endsAt: new Date(start.getTime() + 2 * 3_600_000), type: k === 1 && r.chance(0.4) ? "VIRTUAL" : "IN_PERSON" });
    }
  }

  // Taxes & estimates
  const taxRate = city.taxRate;
  const taxHistory: MaterialisedListing["taxHistory"] = [];
  if (spec.category !== "RENTAL" && !(spec.category === "COMMERCIAL" && spec.transactionType === "LEASE")) {
    const assessed = Math.round((isSale ? price : price * 180) * r.float(0.78, 0.95));
    for (let y = 0; y < 6; y++) {
      const year = now.getFullYear() - 1 - y;
      const value = Math.round(assessed / Math.pow(1 + r.float(0.02, 0.07), y));
      const landShare = spec.category === "LAND" ? 0.92 : r.float(0.22, 0.4);
      taxHistory.push({ year, taxPaid: Math.round(value * taxRate * r.float(0.94, 1.04)), assessedValue: value, landValue: Math.round(value * landShare), improvementValue: Math.round(value * (1 - landShare)) });
    }
    data.propertyTaxAnnual = taxHistory[0]!.taxPaid;
    data.taxAssessedValue = taxHistory[0]!.assessedValue;
  }
  if (spec.category === "RESIDENTIAL") {
    const est = roundTo(price * r.float(0.95, 1.06), 1000);
    const band = r.float(0.04, 0.08);
    Object.assign(data, {
      estimatedValue: est,
      estimateLow: roundTo(est * (1 - band), 1000),
      estimateHigh: roundTo(est * (1 + band), 1000),
      rentEstimate: roundTo(est * r.float(0.0042, 0.0056), 25),
    });
  }
  if (data.sqft && spec.transactionType === "SALE" && !data.pricePerSqft) data.pricePerSqft = Math.round(price / (data.sqft as number));

  // Feature flags
  Object.assign(data, {
    has3dTour: spec.category !== "LAND" && r.chance(0.38),
    hasVideo: r.chance(0.28),
    isFeatured: r.chance(0.18) || Boolean(spec.luxury),
  });
  if (data.has3dTour) data.virtualTourUrl = "demo-3d-tour";
  if (data.hasVideo) data.videoUrl = "demo-video";

  data.headline = headline;
  data.description = description;
  data.slug = slugify(`${street} ${city.name} ${city.state} ${zip} ${spec.key.split("-").pop()}`);
  return { data, priceHistory, taxHistory, openHouses, units, spaces, documents, floorPlanParams };
}
