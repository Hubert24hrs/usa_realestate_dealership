import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cardSelect, toCardData } from "./search/card";

export const AGENT_SORTS = {
  recommended: "Recommended",
  rating: "Highest rated",
  reviews: "Most reviews",
  sales: "Most sales",
  experience: "Most experience",
} as const;
export type AgentSort = keyof typeof AGENT_SORTS;

/** "Listing agents" is a virtual specialty: agents who represent sellers (have sale listings). */
export const LISTING_SPECIALTY = "listing";

export interface AgentFilters {
  q?: string;
  city?: string;
  specialty?: string;
  language?: string;
  minRating?: number;
  sort: AgentSort;
  page: number;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function parseAgentFilters(sp: Record<string, string | string[] | undefined>): AgentFilters {
  const sort = one(sp.sort) as AgentSort | undefined;
  const rating = Number(one(sp.rating));
  const page = Number(one(sp.page));
  const slug = (v?: string) => (v && /^[a-z0-9-]{2,60}$/.test(v) ? v : undefined);
  const text = (v?: string) => (v && v.length <= 60 ? v : undefined);
  return {
    q: text(one(sp.q)),
    city: slug(one(sp.city)),
    specialty: text(one(sp.specialty)),
    language: text(one(sp.language)),
    minRating: rating >= 1 && rating <= 5 ? rating : undefined,
    sort: sort && sort in AGENT_SORTS ? sort : "recommended",
    page: Number.isInteger(page) && page > 1 && page < 500 ? page : 1,
  };
}

export const AGENTS_PER_PAGE = 12;

const agentCardSelect = {
  id: true,
  slug: true,
  name: true,
  title: true,
  brandColor: true,
  rating: true,
  reviewCount: true,
  salesLast12Months: true,
  salesVolume12Mo: true,
  yearsExperience: true,
  specialties: true,
  languages: true,
  areasServed: true,
  plan: true,
  responseTimeMinutes: true,
  organization: { select: { name: true, slug: true, type: true } },
  _count: { select: { listings: { where: { status: { in: ["ACTIVE", "COMING_SOON", "PENDING"] } } } } },
} satisfies Prisma.AgentSelect;
export type AgentCardRow = Prisma.AgentGetPayload<{ select: typeof agentCardSelect }>;

export async function searchAgents(f: AgentFilters) {
  const where: Prisma.AgentWhereInput = {
    ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { organization: { name: { contains: f.q, mode: "insensitive" } } }] } : {}),
    ...(f.city ? { areasServed: { has: f.city } } : {}),
    ...(f.specialty === LISTING_SPECIALTY
      ? { listings: { some: { transactionType: "SALE", status: { in: ["ACTIVE", "COMING_SOON", "PENDING", "SOLD"] } } } }
      : f.specialty
        ? { specialties: { has: f.specialty } }
        : {}),
    ...(f.language ? { languages: { has: f.language } } : {}),
    ...(f.minRating ? { rating: { gte: f.minRating } } : {}),
  };
  const orderBy: Prisma.AgentOrderByWithRelationInput[] =
    f.sort === "rating"
      ? [{ rating: "desc" }, { reviewCount: "desc" }]
      : f.sort === "reviews"
        ? [{ reviewCount: "desc" }, { rating: "desc" }]
        : f.sort === "sales"
          ? [{ salesLast12Months: "desc" }, { rating: "desc" }]
          : f.sort === "experience"
            ? [{ yearsExperience: "desc" }, { rating: "desc" }]
            : // Recommended: paid Premier placement first (disclosed in the UI), then quality signals.
              [{ plan: "desc" }, { rating: "desc" }, { reviewCount: "desc" }];
  const [total, agents] = await Promise.all([
    db.agent.count({ where }),
    db.agent.findMany({ where, orderBy: [...orderBy, { name: "asc" }], skip: (f.page - 1) * AGENTS_PER_PAGE, take: AGENTS_PER_PAGE, select: agentCardSelect }),
  ]);
  return { total, agents, pages: Math.max(1, Math.ceil(total / AGENTS_PER_PAGE)) };
}

/** Filter options built from the data (specialties, languages, markets). */
export const getAgentFacets = cache(async () => {
  const [agents, cities] = await Promise.all([
    db.agent.findMany({ select: { specialties: true, languages: true, areasServed: true } }),
    db.city.findMany({ select: { slug: true, name: true, stateCode: true }, orderBy: { name: "asc" } }),
  ]);
  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));
  const served = new Set(agents.flatMap((a) => a.areasServed));
  return {
    specialties: uniq(agents.flatMap((a) => a.specialties)),
    languages: uniq(agents.flatMap((a) => a.languages)),
    cities: cities.filter((c) => served.has(c.slug)),
  };
});

export const getAgentProfile = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{3,120}$/.test(slug)) return null;
  const now = new Date();
  const agent = await db.agent.findUnique({
    where: { slug },
    include: {
      organization: { select: { name: true, slug: true, type: true, phone: true, address: true, city: true, state: true, zip: true, website: true } },
      reviews: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!agent) return null;
  const [active, sold, histogram, cities] = await Promise.all([
    db.listing.findMany({ where: { agentId: agent.id, status: { in: ["ACTIVE", "COMING_SOON", "PENDING"] } }, orderBy: { listDate: "desc" }, take: 6, select: cardSelect(now) }),
    db.listing.findMany({
      where: { agentId: agent.id, status: { in: ["SOLD", "RENTED"] } },
      orderBy: [{ soldDate: "desc" }, { listDate: "desc" }],
      take: 8,
      select: { slug: true, streetAddress: true, unit: true, city: true, state: true, hideAddress: true, soldPrice: true, price: true, soldDate: true, beds: true, baths: true, sqft: true, propertyType: true, transactionType: true },
    }),
    db.agentReview.groupBy({ by: ["rating"], where: { agentId: agent.id }, _count: true }),
    db.city.findMany({ where: { slug: { in: agent.areasServed } }, select: { slug: true, name: true, stateCode: true } }),
  ]);
  const counts = Object.fromEntries(histogram.map((h) => [h.rating, h._count])) as Record<number, number>;
  return {
    agent,
    activeListings: active.map(toCardData),
    recentSales: sold,
    ratingHistogram: [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: counts[r] ?? 0 })),
    cities,
  };
});
export type AgentProfile = NonNullable<Awaited<ReturnType<typeof getAgentProfile>>>;

export const getOrganization = cache(async (slug: string, type: "BROKERAGE" | "PROPERTY_MANAGEMENT") => {
  if (!/^[a-z0-9-]{3,120}$/.test(slug)) return null;
  const org = await db.organization.findUnique({ where: { slug } });
  if (!org || org.type !== type) return null;
  const now = new Date();
  const [agents, listings, listingCount] = await Promise.all([
    db.agent.findMany({ where: { organizationId: org.id }, orderBy: [{ plan: "desc" }, { rating: "desc" }], select: agentCardSelect }),
    db.listing.findMany({
      where: { OR: [{ organizationId: org.id }, { agent: { organizationId: org.id } }], status: { in: ["ACTIVE", "COMING_SOON"] } },
      orderBy: { listDate: "desc" },
      take: 9,
      select: cardSelect(now),
    }),
    db.listing.count({ where: { OR: [{ organizationId: org.id }, { agent: { organizationId: org.id } }], status: { in: ["ACTIVE", "COMING_SOON", "PENDING"] } } }),
  ]);
  return { org, agents, listings: listings.map(toCardData), listingCount };
});

export async function listOrganizations(type: "BROKERAGE" | "PROPERTY_MANAGEMENT") {
  return db.organization.findMany({
    where: { type },
    orderBy: { name: "asc" },
    select: {
      slug: true, name: true, tagline: true, brandColor: true, city: true, state: true, foundedYear: true, officeCount: true, unitsManaged: true, serviceAreas: true, services: true,
      _count: { select: { agents: true, listings: true } },
    },
  });
}
