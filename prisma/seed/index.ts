/**
 * CITI VIEW demo seed. Everything created here is DEMO DATA (isDemo = true).
 *   npm run db:seed
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { slugify } from "../../src/lib/format";
import { blobPolygon, haversineMiles, jitterPoint } from "../../src/lib/geo";
import { generatedProvider } from "../../src/lib/media/generated";
import { displayRank, mediaPlan } from "../../src/lib/media/pools";
import { UnsplashProvider } from "../../src/lib/media/unsplash";
import { Rng, clamp, roundTo } from "../../src/lib/random";
import { applyPostgis } from "../../scripts/lib/postgis";
import { POSTS } from "./content";
import { CITIES, STATES, citySlug, stateSlug, type CitySeed } from "./geo-data";
import { buildListingSpecs, materialise } from "./listings";
import { MediaAssigner, altFor, loadMediaPool } from "./media";
import {
  AGENT_TITLES,
  AMENITY_NAMES,
  BROKERAGES,
  COMMERCIAL_SPECIALTIES,
  DESIGNATIONS,
  FIRST_NAMES,
  LAND_SPECIALTIES,
  LANGUAGES,
  LAST_NAMES,
  REVIEW_SNIPPETS,
  SCHOOL_ROOTS,
  SPECIALTIES,
  STREET_ROOTS,
  STREET_SUFFIXES,
} from "./names";

const prisma = new PrismaClient();
const now = new Date();
const DAY = 86_400_000;
const AREA_CODES: Record<string, string> = {
  "austin-tx": "512", "denver-co": "303", "nashville-tn": "615", "scottsdale-az": "480", "charlotte-nc": "704",
  "raleigh-nc": "919", "seattle-wa": "206", "miami-fl": "305", "san-diego-ca": "619", "atlanta-ga": "404",
  "chicago-il": "312", "fredericksburg-tx": "830", "bozeman-mt": "406", "asheville-nc": "828", "franklin-tn": "615",
};
const fakePhone = (slug: string, r: Rng) => `(${AREA_CODES[slug] ?? "555"}) 555-01${String(r.int(0, 99)).padStart(2, "0")}`;

interface CityRecord {
  id: string;
  seed: CitySeed;
  slug: string;
  hoods: Array<{ id: string; name: string; lat: number; lng: number }>;
  schools: Array<{ id: string; level: string; lat: number; lng: number; districtId: string }>;
}

async function reset() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`,
    );
  }
}

async function seedGeography(): Promise<Map<string, CityRecord>> {
  for (const s of STATES) {
    await prisma.state.create({ data: { code: s.code, name: s.name, slug: stateSlug(s.name), notice: s.notice } });
  }
  const records = new Map<string, CityRecord>();
  for (const c of CITIES) {
    const slug = citySlug(c);
    const r = new Rng(`city:${slug}`);
    const housingIdx = clamp(Math.round((c.medianHome / 420000) * 100), 70, 240);
    const city = await prisma.city.create({
      data: {
        name: c.name,
        slug,
        stateCode: c.state,
        county: `${c.county} County`,
        lat: c.lat,
        lng: c.lng,
        population: c.population,
        description: c.description,
        medianHomeValue: c.medianHome,
        medianRent: c.medianRent,
        costOfLivingIndex: c.col,
        costOfLiving: {
          housing: housingIdx,
          groceries: clamp(c.col + r.int(-6, 6), 85, 140),
          transportation: clamp(c.col + r.int(-10, 8), 80, 140),
          healthcare: clamp(c.col + r.int(-8, 8), 85, 130),
          utilities: clamp(100 + r.int(-12, 15), 80, 130),
          childcare: clamp(c.col + r.int(-5, 12), 80, 150),
        },
        isRural: Boolean(c.rural),
        seoTitle: `${c.name}, ${c.state} Real Estate — Homes for Sale & Rent`,
        seoDescription: `Search ${c.name}, ${c.state} homes for sale, rentals, new construction and land on CITI VIEW. Demo data.`,
      },
    });
    const record: CityRecord = { id: city.id, seed: c, slug, hoods: [], schools: [] };
    for (const h of c.neighborhoods) {
      const hr = new Rng(`hood:${slug}:${h.name}`);
      const boundary = blobPolygon({ lat: h.lat, lng: h.lng }, (h.r ?? 0.008) * 1.35, hr, 14);
      const created = await prisma.neighborhood.create({
        data: {
          cityId: city.id,
          name: h.name,
          slug: slugify(h.name),
          description: `${h.name} is a ${c.rural ? "rural area" : "neighborhood"} in ${c.name}, ${c.state} known for ${h.highlights.join(", ").toLowerCase()}. Scores and statistics shown are demo data.`,
          boundary: { type: "Polygon", coordinates: [boundary] },
          centerLat: h.lat,
          centerLng: h.lng,
          radiusDeg: h.r ?? 0.008,
          walkScore: h.walk,
          transitScore: h.transit,
          bikeScore: h.bike,
          crimeIndex: hr.int(15, 60),
          noiseLevel: clamp(Math.round(h.walk * 0.6 + hr.int(-10, 12)), 5, 95),
          floodRisk: slug === "miami-fl" ? hr.int(5, 9) : hr.int(1, 4),
          medianPrice: roundTo(c.medianHome * h.premium, 5000),
          highlights: h.highlights,
          seoTitle: `${h.name}, ${c.name} ${c.state} homes for sale`,
          seoDescription: `Homes for sale and rent in ${h.name}, ${c.name}. Demo listings, schools and neighborhood stats.`,
        },
      });
      record.hoods.push({ id: created.id, name: h.name, lat: h.lat, lng: h.lng });
    }

    // School districts & schools (fictional names, demo ratings)
    const lngScale = 1 / Math.cos((c.lat * Math.PI) / 180);
    const districtCount = c.rural ? 1 : 2;
    const roots = r.sample(SCHOOL_ROOTS, 8);
    for (let d = 0; d < districtCount; d++) {
      const center = districtCount === 1 ? { lat: c.lat, lng: c.lng } : { lat: c.lat + r.float(-0.01, 0.01), lng: c.lng + (d === 0 ? -0.035 : 0.035) * lngScale };
      const radius = c.rural ? 0.16 : 0.06;
      const districtName = `${roots[d]} ${c.state === "TX" ? "ISD" : "School District"}`;
      const district = await prisma.schoolDistrict.create({
        data: {
          cityId: city.id,
          name: districtName,
          slug: slugify(`${districtName} ${slug}`),
          boundary: { type: "Polygon", coordinates: [blobPolygon(center, radius, r, 16)] },
          rating: r.int(5, 9),
        },
      });
      const levels = [
        { level: "ELEMENTARY", grades: "K-5", suffix: "Elementary School", size: [380, 720] },
        { level: "MIDDLE", grades: "6-8", suffix: "Middle School", size: [600, 1100] },
        { level: "HIGH", grades: "9-12", suffix: "High School", size: [1200, 2600] },
      ] as const;
      for (const [li, lv] of levels.entries()) {
        const p = jitterPoint(center, radius * 0.6, r);
        const root = roots[2 + d * 3 + li] ?? roots[li]!;
        const name = `${root} ${lv.suffix}`;
        const premium = slug === "franklin-tn" ? 2 : 0;
        const school = await prisma.school.create({
          data: {
            cityId: city.id,
            districtId: district.id,
            name,
            slug: slugify(`${name} ${slug}`),
            level: lv.level,
            type: r.chance(0.12) ? "CHARTER" : "PUBLIC",
            grades: lv.grades,
            rating: clamp(r.int(4, 10) + premium, 1, 10),
            enrollment: r.int(lv.size[0], lv.size[1]),
            studentTeacherRatio: Number(r.float(12, 19).toFixed(1)),
            lat: p.lat,
            lng: p.lng,
            address: `${r.int(100, 4999)} ${r.pick(STREET_ROOTS)} ${r.pick(STREET_SUFFIXES)}, ${c.name}, ${c.state}`,
          },
        });
        record.schools.push({ id: school.id, level: lv.level, lat: p.lat, lng: p.lng, districtId: district.id });
      }
    }
    if (!c.rural) {
      const p = jitterPoint({ lat: c.lat, lng: c.lng }, 0.03, r);
      const name = `${roots[7]} Academy`;
      const school = await prisma.school.create({
        data: { cityId: city.id, name, slug: slugify(`${name} ${slug}`), level: "MIDDLE", type: "PRIVATE", grades: "K-8", rating: r.int(6, 10), enrollment: r.int(220, 520), studentTeacherRatio: 11.5, lat: p.lat, lng: p.lng },
      });
      record.schools.push({ id: school.id, level: "MIDDLE", lat: p.lat, lng: p.lng, districtId: "" });
    }

    // Amenities (fictional businesses)
    const amenities: Prisma.AmenityCreateManyInput[] = [];
    for (const h of c.neighborhoods) {
      for (const type of ["GROCERY", "PARK", "RESTAURANT", "RESTAURANT", "COFFEE"] as const) {
        const p = jitterPoint({ lat: h.lat, lng: h.lng }, (h.r ?? 0.008) * 1.2, r);
        amenities.push({ cityId: city.id, type, name: r.pick(AMENITY_NAMES[type]!), lat: p.lat, lng: p.lng });
      }
    }
    for (const type of ["GYM", "TRANSIT", "TRANSIT", "HOSPITAL", "SHOPPING", "LIBRARY"] as const) {
      if (type === "TRANSIT" && c.rural) continue;
      const p = jitterPoint({ lat: c.lat, lng: c.lng }, c.rural ? 0.05 : 0.025, r);
      amenities.push({ cityId: city.id, type, name: r.pick(AMENITY_NAMES[type]!), lat: p.lat, lng: p.lng });
    }
    await prisma.amenity.createMany({ data: amenities });
    records.set(slug, record);
  }
  return records;
}

interface AgentRecord {
  id: string;
  orgId: string;
  orgKey: string;
  name: string;
  cities: string[];
  focus: string;
}

async function seedOrganizations() {
  const orgs = new Map<string, { id: string; name: string; cities: string[]; kind: string; focus?: string }>();
  const agents: AgentRecord[] = [];
  const usedNames = new Set<string>();
  const nameRng = new Rng("agent-names");
  const uniqueName = () => {
    for (;;) {
      const name = `${nameRng.pick(FIRST_NAMES)} ${nameRng.pick(LAST_NAMES)}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
  };

  for (const b of BROKERAGES) {
    const r = new Rng(`org:${b.key}`);
    const home = CITIES.find((c) => citySlug(c) === b.cities[0])!;
    const org = await prisma.organization.create({
      data: {
        type: b.kind,
        name: b.name,
        slug: b.key,
        tagline: b.tagline,
        description: `${b.name} is a ${b.kind === "BROKERAGE" ? `${b.focus ?? "residential"} brokerage` : "property management company"} serving ${b.cities
          .map((s) => CITIES.find((c) => citySlug(c) === s)?.name)
          .filter(Boolean)
          .join(", ")}. ${b.tagline} This is a fictional demo company created for CITI VIEW.`,
        licenseNumber: `${home.state} Lic. #${r.int(100000, 999999)} (demo)`,
        licenseState: home.state,
        phone: fakePhone(b.cities[0]!, r),
        email: `hello@${b.key}.example`,
        website: `https://${b.key}.example`,
        address: `${r.int(100, 2999)} ${r.pick(STREET_ROOTS)} ${r.pick(STREET_SUFFIXES)}, Suite ${r.int(100, 900)}`,
        city: home.name,
        state: home.state,
        zip: "00000",
        brandColor: b.color,
        foundedYear: b.founded,
        officeCount: r.int(1, 6),
        unitsManaged: b.kind === "PROPERTY_MANAGEMENT" ? r.int(1800, 9500) : null,
        serviceAreas: b.cities,
        services: b.services,
      },
    });
    orgs.set(b.key, { id: org.id, name: b.name, cities: b.cities, kind: b.kind, focus: b.focus });

    const count = b.kind === "PROPERTY_MANAGEMENT" ? 1 : b.focus === "residential" ? (b.cities.length > 1 ? 4 : 3) : 3;
    for (let i = 0; i < count; i++) {
      const name = uniqueName();
      const ar = new Rng(`agent:${name}`);
      const cities = b.cities.length > 1 ? ar.sample(b.cities, Math.min(b.cities.length, ar.int(1, 3))) : b.cities;
      const focus = b.kind === "PROPERTY_MANAGEMENT" ? "rentals" : b.focus ?? "residential";
      const specialties =
        focus === "commercial" ? ar.sample(COMMERCIAL_SPECIALTIES, 3) : focus === "land" ? ar.sample(LAND_SPECIALTIES, 3) : focus === "rentals" ? ["Rentals & leasing", "Relocation"] : ar.sample(SPECIALTIES, 3);
      const years = ar.int(3, 26);
      const reviews = Array.from({ length: ar.int(3, 7) }, (_, k) => ({
        authorName: `${ar.pick(FIRST_NAMES)} ${ar.pick(LAST_NAMES)[0]}.`,
        rating: ar.chance(0.8) ? 5 : 4,
        title: ar.pick(["Highly recommend", "Great experience", "Made it easy", "Knows the market", "Would hire again"]),
        body: ar.pick(REVIEW_SNIPPETS),
        transaction: focus === "commercial" ? "Leased office space" : focus === "land" ? "Bought land" : focus === "rentals" ? "Rented a home" : ar.pick(["Bought a home", "Sold a home", "Bought and sold"]),
        location: CITIES.find((c) => citySlug(c) === ar.pick(cities))?.name ?? null,
        isVerified: ar.chance(0.7),
        createdAt: new Date(now.getTime() - (k * 41 + ar.int(1, 40)) * DAY),
      }));
      const rating = Number((reviews.reduce((a, rv) => a + rv.rating, 0) / reviews.length).toFixed(1));
      const plan = ar.chance(0.25) ? "PREMIER" : ar.chance(0.4) ? "PRO" : "FREE";
      const agent = await prisma.agent.create({
        data: {
          organizationId: org.id,
          name,
          slug: slugify(`${name} ${b.key}`),
          title: focus === "commercial" ? "Senior Vice President" : focus === "land" ? "Land Specialist" : focus === "rentals" ? "Leasing Director" : ar.pick(AGENT_TITLES),
          email: `${slugify(name).replace(/-/g, ".")}@${b.key}.example`,
          phone: fakePhone(cities[0]!, ar),
          bio: `${name.split(" ")[0]} has helped clients ${focus === "commercial" ? "lease and acquire commercial property" : focus === "land" ? "buy and sell ranches, recreational land and timber" : focus === "rentals" ? "find and lease apartment homes" : "buy and sell homes"} for ${years} years across ${cities
            .map((s) => CITIES.find((c) => citySlug(c) === s)?.name)
            .join(" and ")}. Known for clear communication and careful negotiation, ${name.split(" ")[0]} specializes in ${specialties.join(", ").toLowerCase()}. Demo agent profile — not a real person.`,
          brandColor: ar.pick(["#3b3fa8", "#2f6f73", "#b5543c", "#8e5572", "#4a6b8a", "#6b8f71", "#c98d4a"]),
          licenseNumber: `${CITIES.find((c) => citySlug(c) === cities[0])?.state ?? "TX"} #${ar.int(100000, 999999)} (demo)`,
          licenseState: CITIES.find((c) => citySlug(c) === cities[0])?.state ?? "TX",
          yearsExperience: years,
          specialties,
          languages: ar.chance(0.45) ? ["English", ar.pick(LANGUAGES.slice(1))] : ["English"],
          areasServed: cities,
          designations: ar.sample(DESIGNATIONS, ar.int(0, 3)),
          rating,
          reviewCount: reviews.length,
          salesLast12Months: ar.int(6, 42),
          salesVolume12Mo: ar.int(4, 60) * 1_000_000,
          responseTimeMinutes: ar.pick([5, 10, 15, 30, 60]),
          plan,
          leadWeight: plan === "PREMIER" ? 3 : plan === "PRO" ? 2 : 1,
          planRenewsAt: plan === "FREE" ? null : new Date(now.getTime() + ar.int(5, 28) * DAY),
          reviews: { create: reviews },
        },
      });
      agents.push({ id: agent.id, orgId: org.id, orgKey: b.key, name, cities, focus });
    }
  }
  return { orgs, agents };
}

async function seedUsers(orgs: Map<string, { id: string }>, agents: AgentRecord[]) {
  const austinAgent = agents.find((a) => a.orgKey === "skyline-stone")!;
  const make = (email: string, name: string, role: Prisma.UserCreateInput["role"], extra: Partial<Prisma.UserUncheckedCreateInput> = {}) =>
    prisma.user.create({ data: { email, name, role, isDemo: true, emailVerified: now, ...extra } as Prisma.UserUncheckedCreateInput });
  const buyer = await make("buyer@citiview.test", "Jordan Avery", "USER", { phone: "(512) 555-0142" });
  const renter = await make("renter@citiview.test", "Sam Rivera", "USER", { phone: "(512) 555-0188" });
  const seller = await make("seller@citiview.test", "Taylor Brooks", "USER", { phone: "(404) 555-0119" });
  const agentUser = await make("agent@citiview.test", austinAgent.name, "AGENT", { phone: "(512) 555-0101" });
  await prisma.agent.update({ where: { id: austinAgent.id }, data: { userId: agentUser.id } });
  const manager = await make("manager@citiview.test", "Riley Chen", "PROPERTY_MANAGER", { organizationId: orgs.get("keystone-residential")!.id });
  const admin = await make("admin@citiview.test", "Avery Admin", "ADMIN");
  for (const u of [buyer, renter, seller, agentUser, manager, admin]) {
    await prisma.notificationPreference.create({ data: { userId: u.id } });
  }
  return { buyer, renter, seller, agentUser, manager, admin, austinAgent };
}

async function seedListings(
  cities: Map<string, CityRecord>,
  orgs: Map<string, { id: string; name: string; cities: string[]; kind: string; focus?: string }>,
  agents: AgentRecord[],
  sellerId: string,
) {
  const specs = buildListingSpecs();
  const pool = loadMediaPool();
  const assigner = new MediaAssigner(pool);
  const unsplash = new UnsplashProvider();
  const unsplashUses: Array<Promise<void>> = [];
  const created: Array<{ id: string; citySlug: string; lat: number; lng: number; agentId: string | null; status: string; category: string }> = [];

  for (const [i, spec] of specs.entries()) {
    const m = materialise(spec, i, now);
    const city = cities.get(spec.citySlug)!;
    const hood = city.hoods[spec.hood % city.hoods.length]!;
    const r = new Rng(`${spec.key}:assign`);

    let agent: AgentRecord | undefined;
    let orgId: string | null = null;
    if (spec.category === "COMMERCIAL") agent = r.pick(agents.filter((a) => a.orgKey === "meridian-commercial"));
    else if (spec.category === "LAND") agent = r.pick(agents.filter((a) => a.orgKey === "open-range"));
    else if (spec.community) {
      const pm = [...orgs.entries()].find(([, o]) => o.kind === "PROPERTY_MANAGEMENT" && o.cities.includes(spec.citySlug)) ?? [...orgs.entries()].find(([k]) => k === "keystone-residential")!;
      orgId = pm[1].id;
      agent = agents.find((a) => a.orgId === pm[1].id);
    } else if (!spec.fsbo) {
      const local = agents.filter((a) => a.focus === "residential" && a.cities.includes(spec.citySlug));
      agent = local.length ? r.pick(local) : r.pick(agents.filter((a) => a.focus === "residential"));
    }
    if (agent && !orgId) orgId = agent.orgId;
    const orgName = orgId ? [...orgs.values()].find((o) => o.id === orgId)?.name : null;

    // Media: room plan + generated floor plan / topo map
    const plan = mediaPlan({ category: spec.category, propertyType: spec.propertyType, isCommunity: spec.community }, new Rng(`${spec.key}:media`));
    const label = `${m.data.streetAddress as string}, ${city.seed.name}`;
    const commercialVariant = spec.variant === "mixed" ? "mixed" : spec.variant === "industrial" ? "industrial" : spec.variant === "retail" ? "retail" : "office";
    const images = plan.map((poolKey, k) => assigner.take(poolKey, `${spec.key}-${k}`, { label, variant: poolKey === "EXTERIOR_COMMERCIAL" ? commercialVariant : undefined }));
    images.push(
      spec.category === "LAND"
        ? generatedProvider.image("topography", `${spec.key}-topo`, `Topography and parcel map for ${label} (illustrative)`, m.floorPlanParams)
        : generatedProvider.image("floor-plan", `${spec.key}-plan`, `Floor plan for ${label} (illustrative)`, m.floorPlanParams),
    );
    const ordered = images
      .map((img, idx) => ({ img, idx }))
      .sort((a, b) => displayRank(a.img.category) - displayRank(b.img.category) || a.idx - b.idx)
      .map((x) => x.img);
    for (const img of ordered) if (img.provider === "UNSPLASH" && unsplash.isConfigured()) unsplashUses.push(unsplash.registerUse(img));

    const listing = await prisma.listing.create({
      data: {
        ...(m.data as Prisma.ListingUncheckedCreateInput),
        cityId: city.id,
        neighborhoodId: hood.id,
        agentId: agent?.id ?? null,
        organizationId: orgId,
        ownerId: spec.fsbo ? sellerId : null,
        brokerageName: spec.fsbo ? null : orgName ?? null,
        listingAgentName: spec.fsbo ? "Listed by owner" : agent?.name ?? null,
        viewCount: r.int(40, 1400),
        saveCount: r.int(2, 90),
        media: {
          create: ordered.map((img, k) => ({
            type: img.category === "FLOOR_PLAN" ? "FLOOR_PLAN" : "PHOTO",
            category: img.category,
            url: img.url,
            width: img.width,
            height: img.height,
            alt: altFor(img, label),
            blurDataUrl: img.blurDataUrl ?? null,
            color: img.color ?? null,
            sortOrder: k,
            isPrimary: k === 0,
            provider: img.provider,
            providerId: img.providerId,
            photographer: img.photographer ?? null,
            photographerUrl: img.photographerUrl ?? null,
            sourceUrl: img.sourceUrl ?? null,
            license: img.license,
            downloadLocation: img.downloadLocation ?? null,
          })),
        },
        priceHistory: { create: m.priceHistory.map((p) => ({ ...p, event: p.event as Prisma.PriceHistoryCreateWithoutListingInput["event"] })) },
        taxHistory: { create: m.taxHistory },
        openHouses: { create: m.openHouses },
        units: { create: m.units as Prisma.RentalUnitCreateWithoutListingInput[] },
        spaces: { create: m.spaces as Prisma.CommercialSpaceCreateWithoutListingInput[] },
        documents: { create: m.documents as Prisma.ListingDocumentCreateWithoutListingInput[] },
      },
    });
    created.push({ id: listing.id, citySlug: spec.citySlug, lat: listing.lat, lng: listing.lng, agentId: listing.agentId, status: listing.status, category: listing.category });

    // Nearest school per level
    const links: Prisma.ListingSchoolCreateManyInput[] = [];
    for (const level of ["ELEMENTARY", "MIDDLE", "HIGH"]) {
      const ranked = city.schools
        .filter((s) => s.level === level)
        .map((s) => ({ s, d: haversineMiles({ lat: listing.lat, lng: listing.lng }, s) }))
        .sort((a, b) => a.d - b.d);
      ranked.slice(0, level === "MIDDLE" ? 2 : 1).forEach(({ s, d }, idx) =>
        links.push({ listingId: listing.id, schoolId: s.id, distanceMiles: Number(d.toFixed(2)), isAssigned: idx === 0 && s.districtId !== "" }),
      );
    }
    await prisma.listingSchool.createMany({ data: links, skipDuplicates: true });
  }
  await Promise.allSettled(unsplashUses);
  return { created, stats: assigner.stats, poolProviders: pool?.providers ?? [] };
}

async function seedMarket(cities: Map<string, CityRecord>) {
  const stats: Prisma.MarketStatCreateManyInput[] = [];
  for (const [slug, city] of cities) {
    const r = new Rng(`market:${slug}`);
    const trend = r.float(-0.002, 0.006);
    for (let m = 23; m >= 0; m--) {
      const month = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const season = 1 + 0.025 * Math.sin(((month.getMonth() - 2) / 12) * Math.PI * 2);
      const growth = Math.pow(1 + trend, 23 - m);
      const list = roundTo(city.seed.medianHome * growth * season * r.float(0.985, 1.015), 1000);
      stats.push({
        cityId: city.id,
        month,
        medianListPrice: list,
        medianSoldPrice: roundTo(list * r.float(0.965, 1.0), 1000),
        medianRent: roundTo(city.seed.medianRent * Math.pow(1 + trend * 0.7, 23 - m) * r.float(0.985, 1.015), 5),
        medianPricePerSqft: Math.round(list / r.float(1750, 2050)),
        inventory: Math.round((city.seed.population / (city.seed.rural ? 120 : 400)) * (2 - season) * r.float(0.9, 1.1)),
        newListings: Math.round((city.seed.population / (city.seed.rural ? 900 : 2600)) * season * r.float(0.85, 1.15)),
        medianDaysOnMarket: Math.round(r.float(18, 52) * (2 - season)),
        saleToListRatio: Number(r.float(0.965, 1.01).toFixed(3)),
      });
    }
  }
  await prisma.marketStat.createMany({ data: stats });

  const products = [
    { product: "30-year fixed", slug: "30-year-fixed", base: 6.18 },
    { product: "15-year fixed", slug: "15-year-fixed", base: 5.52 },
    { product: "5/1 ARM", slug: "5-1-arm", base: 5.94 },
    { product: "30-year FHA", slug: "30-year-fha", base: 5.86 },
    { product: "30-year VA", slug: "30-year-va", base: 5.71 },
    { product: "30-year jumbo", slug: "30-year-jumbo", base: 6.39 },
  ];
  const rates: Prisma.MortgageRateCreateManyInput[] = [];
  const rr = new Rng("rates");
  for (const p of products) {
    let rate = p.base + 0.25;
    for (let w = 11; w >= 0; w--) {
      rate = clamp(rate + rr.float(-0.09, 0.06), p.base - 0.4, p.base + 0.4);
      rates.push({ product: p.product, slug: p.slug, rate: Number(rate.toFixed(3)), apr: Number((rate + rr.float(0.08, 0.22)).toFixed(3)), points: Number(rr.float(0, 0.9).toFixed(1)), date: new Date(now.getTime() - w * 7 * DAY) });
    }
  }
  await prisma.mortgageRate.createMany({ data: rates });
}

async function seedContent() {
  for (const [i, p] of POSTS.entries()) {
    await prisma.post.create({
      data: {
        type: p.type,
        status: "PUBLISHED",
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        body: p.body,
        coverColor: p.coverColor,
        authorName: "CITI VIEW Editorial (demo)",
        tags: p.tags,
        citySlug: p.citySlug ?? null,
        readingMinutes: Math.max(2, Math.round(p.body.split(/\s+/).length / 220)),
        publishedAt: new Date(now.getTime() - (i * 6 + 2) * DAY),
        seoTitle: p.title,
        seoDescription: p.excerpt,
      },
    });
  }
  await prisma.post.create({
    data: { type: "BLOG", status: "DRAFT", title: "Draft: winterizing checklist", slug: "draft-winterizing-checklist", excerpt: "Unpublished draft for the CMS demo.", body: "Work in progress.", tags: ["Maintenance"], authorName: "CITI VIEW Editorial (demo)" },
  });

  const settings: Array<[string, Prisma.InputJsonValue]> = [
    ["compliance.idxDisclaimer", "IDX information is provided exclusively for consumers' personal, non-commercial use and may not be used for any purpose other than to identify prospective properties consumers may be interested in purchasing. Information is deemed reliable but is not guaranteed. DEMO NOTICE: every listing, agent, review and statistic on this site is fictional demo data created for the CITI VIEW platform."],
    ["compliance.listingDisclaimer", "Listing information is provided by the listing brokerage via the Demo MLS and is deemed reliable but not guaranteed. Square footage, acreage and school assignments should be independently verified. Demo data — not an offer to sell or lease."],
    ["compliance.brokerage", { name: "CITI VIEW Realty, LLC (placeholder)", licenses: ["TX TREC #0000000 (placeholder)", "CA DRE #00000000 (placeholder)", "FL #BK0000000 (placeholder)"], address: "100 Example Plaza, Suite 100, Austin, TX 78701 (placeholder)", phone: "(512) 555-0100" }],
    ["compliance.fairHousing", "CITI VIEW is committed to compliance with all federal, state and local fair housing laws. We do not discriminate on the basis of race, color, religion, sex, sexual orientation, gender identity, national origin, familial status, disability or any other protected characteristic. Equal Housing Opportunity."],
    ["site.demoBanner", "You're exploring CITI VIEW demo data — listings, agents and statistics are fictional."],
    ["leads.routing", { strategy: "weighted-round-robin", preferListingAgent: true, slaMinutes: 15 }],
  ];
  for (const [key, value] of settings) await prisma.siteSetting.create({ data: { key, value } });
}

async function seedActivity(
  users: Awaited<ReturnType<typeof seedUsers>>,
  listings: Array<{ id: string; citySlug: string; agentId: string | null; status: string; category: string }>,
) {
  const r = new Rng("activity");
  const { buyer, renter, agentUser, austinAgent, admin } = users;
  const forSale = listings.filter((l) => l.category === "RESIDENTIAL" && l.status === "ACTIVE");
  const austin = forSale.filter((l) => l.citySlug === "austin-tx");
  const favs = [...austin, ...r.sample(forSale, 4)].slice(0, 7);
  for (const l of favs) await prisma.favorite.create({ data: { userId: buyer.id, listingId: l.id } }).catch(() => undefined);

  const collection = await prisma.collection.create({ data: { ownerId: buyer.id, name: "Austin shortlist", description: "Homes to tour with my agent" } });
  for (const [k, l] of austin.slice(0, 3).entries()) {
    await prisma.collectionItem.create({ data: { collectionId: collection.id, listingId: l.id, addedById: buyer.id, sharedNote: ["Love the yard — check the roof age.", "Great location; HOA seems high.", null][k] ?? null } });
  }
  await prisma.collectionMember.create({ data: { collectionId: collection.id, userId: agentUser.id, email: agentUser.email!, role: "EDITOR", isAgent: true, inviteToken: `demo-invite-${collection.id}`, acceptedAt: now } });
  await prisma.collection.create({ data: { ownerId: buyer.id, name: "Weekend ideas", description: "Places to see if we expand the search" } });

  await prisma.savedSearch.createMany({
    data: [
      { userId: buyer.id, name: "Austin · 3+ beds under $750K", filters: { mode: "buy", place: "austin-tx", bedsMin: 3, price: { max: 750000 } }, path: "/homes-for-sale/austin-tx?beds=3&price=-750000", frequency: "DAILY", lastCheckedAt: now },
      { userId: buyer.id, name: "Denver condos", filters: { mode: "buy", place: "denver-co", homeTypes: ["CONDO"] }, path: "/homes-for-sale/denver-co?type=CONDO", frequency: "WEEKLY", lastCheckedAt: now },
      { userId: renter.id, name: "Austin rentals with pets", filters: { mode: "rent", place: "austin-tx", pets: "dogs" }, path: "/apartments-for-rent/austin-tx?pets=dogs", frequency: "INSTANT", lastCheckedAt: now },
    ],
  });
  if (favs[0]) await prisma.note.create({ data: { userId: buyer.id, listingId: favs[0].id, body: "Ask about the HVAC age and whether the seller will credit the roof." } });
  if (favs[1]) await prisma.note.create({ data: { userId: buyer.id, listingId: favs[1].id, body: "10 min bike to work. Compare HOA with the townhome on Larkspur." } });
  for (const [k, l] of r.sample(forSale, 8).entries()) {
    await prisma.listingView.create({ data: { userId: buyer.id, listingId: l.id, viewedAt: new Date(now.getTime() - k * 5 * 3_600_000) } }).catch(() => undefined);
  }

  const agentListings = listings.filter((l) => l.agentId === austinAgent.id);
  const tourTarget = agentListings[0] ?? austin[0]!;
  await prisma.tourRequest.create({ data: { listingId: tourTarget.id, userId: buyer.id, agentId: austinAgent.id, type: "IN_PERSON", status: "CONFIRMED", name: buyer.name!, email: buyer.email!, phone: buyer.phone, preferredDate: new Date(now.getTime() + 2 * DAY), preferredTime: "10:00 AM", confirmedAt: now } });
  await prisma.tourRequest.create({ data: { listingId: (austin[1] ?? tourTarget).id, userId: buyer.id, agentId: austinAgent.id, type: "VIDEO", status: "REQUESTED", name: buyer.name!, email: buyer.email!, preferredDate: new Date(now.getTime() + 4 * DAY), preferredTime: "Afternoon", message: "Could we do a FaceTime walkthrough?" } });

  const convo = await prisma.conversation.create({
    data: {
      subject: "Tour this Saturday",
      listingId: tourTarget.id,
      participants: { create: [{ userId: buyer.id, lastReadAt: now }, { userId: agentUser.id, lastReadAt: new Date(now.getTime() - 3_600_000) }] },
    },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: convo.id, senderId: buyer.id, body: "Hi! Is the home still available for a tour this Saturday morning?", createdAt: new Date(now.getTime() - 26 * 3_600_000) },
      { conversationId: convo.id, senderId: agentUser.id, body: "Yes — I've booked 10:00 AM. I'll send the disclosures beforehand.", createdAt: new Date(now.getTime() - 25 * 3_600_000) },
      { conversationId: convo.id, senderId: buyer.id, body: "Perfect, thank you. Could you also pull comps for the street?", createdAt: new Date(now.getTime() - 2 * 3_600_000) },
    ],
  });

  // Leads for the demo agent and others
  const leadTypes = ["TOUR", "REQUEST_INFO", "ASK_AGENT", "OFFER_INTEREST", "CONTACT_AGENT", "PREAPPROVAL", "SELLER_CONSULT", "HOME_VALUE"] as const;
  const statuses = ["NEW", "NEW", "CONTACTED", "QUALIFIED", "NURTURE", "CLOSED"] as const;
  const leads: Prisma.LeadCreateManyInput[] = [];
  for (let k = 0; k < 14; k++) {
    const l = k < 9 ? agentListings[k % Math.max(1, agentListings.length)] ?? tourTarget : r.pick(forSale);
    const first = r.pick(FIRST_NAMES);
    const last = r.pick(LAST_NAMES);
    leads.push({
      type: r.pick(leadTypes),
      status: r.pick(statuses),
      listingId: l.id,
      agentId: k < 9 ? austinAgent.id : l.agentId,
      name: `${first} ${last}`,
      email: `${first}.${last}@example.com`.toLowerCase(),
      phone: `(512) 555-01${String(r.int(0, 99)).padStart(2, "0")}`,
      message: r.pick(["Is this still available?", "Can I see it this weekend?", "What are the HOA dues?", "Interested in making an offer.", "Is the seller flexible on closing date?"]),
      source: "/property",
      routingReason: k < 9 ? "Listing agent" : "Weighted round-robin (demo)",
      assignedAt: new Date(now.getTime() - k * 9 * 3_600_000),
      createdAt: new Date(now.getTime() - k * 9 * 3_600_000),
    });
  }
  await prisma.lead.createMany({ data: leads });

  // Rental application → lease → payments for the renter
  const community = await prisma.listing.findFirst({ where: { isCommunity: true, city: "Austin" }, include: { units: true } });
  if (community && community.units[0]) {
    const unit = community.units[0];
    const app = await prisma.rentalApplication.create({
      data: {
        listingId: community.id,
        unitId: unit.id,
        userId: renter.id,
        status: "APPROVED",
        moveInDate: new Date(now.getTime() - 40 * DAY),
        leaseTermMonths: 12,
        applicant: { firstName: "Sam", lastName: "Rivera", email: renter.email, phone: renter.phone, currentAddress: "1200 Example Ave, Austin, TX", monthsAtAddress: 26, currentRent: 1650 },
        employment: { employer: "Demo Analytics Co.", position: "Product designer", monthlyIncome: 7800, startDate: "2022-03-01" },
        occupants: 1,
        consentScreening: true,
        consentAt: new Date(now.getTime() - 55 * DAY),
        feeAmount: 50,
        feePaid: true,
        submittedAt: new Date(now.getTime() - 55 * DAY),
        decidedAt: new Date(now.getTime() - 52 * DAY),
        decisionNote: "Approved — welcome home!",
      },
    });
    const lease = await prisma.lease.create({
      data: {
        applicationId: app.id,
        listingId: community.id,
        unitId: unit.id,
        tenantId: renter.id,
        startDate: new Date(now.getTime() - 40 * DAY),
        endDate: new Date(now.getTime() + 325 * DAY),
        monthlyRent: unit.rent,
        securityDeposit: unit.deposit ?? 500,
        status: "ACTIVE",
        terms: `Residential lease (DEMO) for Unit ${unit.unitNumber} at ${community.communityName ?? community.streetAddress}. Monthly rent $${unit.rent}. This demo lease is not a legal document.`,
        landlordName: "Keystone Residential Management (demo)",
        signatureName: "Sam Rivera",
        signedAt: new Date(now.getTime() - 48 * DAY),
      },
    });
    for (let p = 1; p >= 0; p--) {
      const period = new Date(now.getFullYear(), now.getMonth() - p, 1);
      await prisma.rentPayment.create({ data: { leaseId: lease.id, userId: renter.id, amountCents: unit.rent * 100, periodStart: period, status: "PAID", method: "simulated", paidAt: new Date(period.getTime() + 2 * DAY) } });
    }
  }
  const denverCommunity = await prisma.listing.findFirst({ where: { isCommunity: true, city: "Denver" }, include: { units: true } });
  if (denverCommunity?.units[1]) {
    await prisma.rentalApplication.create({
      data: {
        listingId: denverCommunity.id,
        unitId: denverCommunity.units[1].id,
        userId: renter.id,
        status: "UNDER_REVIEW",
        moveInDate: new Date(now.getTime() + 30 * DAY),
        leaseTermMonths: 12,
        applicant: { firstName: "Sam", lastName: "Rivera", email: renter.email, phone: renter.phone },
        employment: { employer: "Demo Analytics Co.", position: "Product designer", monthlyIncome: 7800 },
        consentScreening: true,
        consentAt: new Date(now.getTime() - 2 * DAY),
        feeAmount: 50,
        feePaid: true,
        submittedAt: new Date(now.getTime() - 2 * DAY),
      },
    });
  }

  // Notifications
  await prisma.notification.createMany({
    data: [
      { userId: buyer.id, type: "ALERT_MATCH", title: "2 new homes match “Austin · 3+ beds under $750K”", url: "/homes-for-sale/austin-tx?beds=3&price=-750000", createdAt: new Date(now.getTime() - 3 * 3_600_000) },
      { userId: buyer.id, type: "PRICE_DROP", title: "Price cut on a home you saved", body: "A saved home dropped its price.", url: `/account/favorites`, createdAt: new Date(now.getTime() - 20 * 3_600_000) },
      { userId: buyer.id, type: "TOUR_UPDATE", title: "Tour confirmed for Saturday at 10:00 AM", url: "/account/tours", readAt: now },
      { userId: buyer.id, type: "MESSAGE", title: `New message from ${austinAgent.name}`, url: "/account/messages" },
      { userId: renter.id, type: "APPLICATION_UPDATE", title: "Your Denver application is under review", url: "/account/applications" },
      { userId: agentUser.id, type: "LEAD", title: "New tour request from Jordan Avery", url: "/agent/leads" },
      { userId: admin.id, type: "SYSTEM", title: "2 listing reports need review", url: "/admin/moderation" },
    ],
  });

  // Moderation queue
  const rentals = listings.filter((l) => l.category === "RENTAL");
  await prisma.report.createMany({
    data: [
      { listingId: rentals[0]!.id, reason: "SCAM_OR_FRAUD", details: "Someone texted me claiming to be the owner and asked for a deposit via gift cards.", email: "concerned.renter@example.com" },
      { listingId: forSale[3]!.id, reason: "INACCURATE_INFO", details: "Square footage looks wrong compared with county records.", userId: buyer.id },
      { listingId: forSale[5]!.id, reason: "DUPLICATE", details: "Same home appears twice.", status: "RESOLVED", resolution: "Verified unique listing — no action.", resolvedById: admin.id, resolvedAt: new Date(now.getTime() - 5 * DAY) },
    ],
  });

  // Analytics events: per-day activity on the demo agent's listings + site searches
  const events: Prisma.AnalyticsEventCreateManyInput[] = [];
  for (let d = 29; d >= 0; d--) {
    const day = new Date(now.getTime() - d * DAY);
    for (const l of agentListings) {
      const views = r.int(4, 36);
      for (let v = 0; v < views; v++) events.push({ type: "listing_view", listingId: l.id, agentId: austinAgent.id, createdAt: new Date(day.getTime() - r.int(0, 86_000) * 1000), path: "/property" });
      for (let s = 0; s < r.int(0, 4); s++) events.push({ type: "listing_save", listingId: l.id, agentId: austinAgent.id, createdAt: day });
      if (r.chance(0.3)) events.push({ type: "lead", listingId: l.id, agentId: austinAgent.id, createdAt: day });
      if (r.chance(0.4)) events.push({ type: "share", listingId: l.id, agentId: austinAgent.id, createdAt: day });
    }
    for (let s = 0; s < r.int(18, 48); s++) {
      events.push({ type: "search", createdAt: new Date(day.getTime() - r.int(0, 86_000) * 1000), data: { mode: r.pick(["buy", "buy", "rent", "sold", "new", "commercial", "land"]), place: r.pick([...new Set(listings.map((l) => l.citySlug))]) } });
    }
  }
  await prisma.analyticsEvent.createMany({ data: events });
}

async function main() {
  const started = Date.now();
  console.log("Resetting database …");
  await reset();
  console.log("Seeding geography, schools and amenities …");
  const cities = await seedGeography();
  console.log("Seeding brokerages, agents and reviews …");
  const { orgs, agents } = await seedOrganizations();
  const users = await seedUsers(orgs, agents);
  console.log("Seeding listings and media …");
  const { created, stats, poolProviders } = await seedListings(cities, orgs, agents, users.seller.id);
  console.log("Seeding market stats, rates, CMS and settings …");
  await seedMarket(cities);
  await seedContent();
  console.log("Seeding demo user activity …");
  await seedActivity(users, created);
  await applyPostgis(prisma);

  const mediaCount = await prisma.listingMedia.count();
  console.log(`\n✔ Seeded ${created.length} demo listings with ${mediaCount} images (${stats.pool} stock photos from ${poolProviders.join(", ") || "no pool"}, ${stats.generated + created.length} generated illustrations/plans).`);
  if (!poolProviders.length) {
    console.log("  Tip: add PEXELS_API_KEY to .env.local, run `npm run media:fetch`, then `npm run db:seed` to use real photos.");
  }
  console.log(`  Demo logins: buyer@ / renter@ / seller@ / agent@ / manager@ / admin@citiview.test (one-click on /sign-in in demo mode)`);
  console.log(`  Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
