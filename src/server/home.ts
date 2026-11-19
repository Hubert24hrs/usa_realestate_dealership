import "server-only";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { monthlyPayment } from "@/lib/finance/mortgage";
import { cardSelect, railCard, toCardData } from "./search/card";

export const SNAPSHOT_CITIES = ["austin-tx", "denver-co", "nashville-tn", "miami-fl", "seattle-wa", "chicago-il"];

export interface MarketSeries {
  slug: string;
  name: string;
  state: string;
  months: Array<{ label: string; list: number; sold: number; rent: number; dom: number; inventory: number; ppsf: number; saleToList: number }>;
}

/** Everything the home page needs, cached for 5 minutes (JSON-safe: dates as strings). */
export const getHomeData = unstable_cache(
  async () => {
    const now = new Date();
    const select = cardSelect(now);
    const forSale: Prisma.ListingWhereInput = { category: "RESIDENTIAL", transactionType: "SALE", status: { in: ["ACTIVE", "COMING_SOON"] } };
    const [newest, drops, openHouses, luxury, rentals, rates, posts, agents, hoods, cities, counts] = await Promise.all([
      db.listing.findMany({ where: forSale, orderBy: { listDate: "desc" }, take: 8, select }),
      db.listing.findMany({ where: { ...forSale, priceReducedAt: { not: null } }, orderBy: { priceReducedAt: "desc" }, take: 8, select }),
      db.listing.findMany({ where: { ...forSale, openHouses: { some: { endsAt: { gte: now } } } }, orderBy: { listDate: "desc" }, take: 8, select }),
      db.listing.findMany({ where: { ...forSale, OR: [{ isLuxury: true }, { price: { gte: 1_250_000 } }] }, orderBy: { price: "desc" }, take: 8, select }),
      db.listing.findMany({ where: { category: "RENTAL", status: "ACTIVE" }, orderBy: [{ isCommunity: "desc" }, { listDate: "desc" }], take: 8, select }),
      db.mortgageRate.findMany({ orderBy: { date: "desc" }, distinct: ["slug"], take: 6 }),
      db.post.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 6, select: { slug: true, title: true, excerpt: true, type: true, coverColor: true, readingMinutes: true, publishedAt: true, tags: true } }),
      db.agent.findMany({
        where: { plan: { in: ["PREMIER", "PRO"] } },
        orderBy: [{ plan: "desc" }, { rating: "desc" }, { reviewCount: "desc" }],
        take: 8,
        select: { slug: true, name: true, title: true, brandColor: true, rating: true, reviewCount: true, salesLast12Months: true, areasServed: true, specialties: true, organization: { select: { name: true } } },
      }),
      db.neighborhood.findMany({
        where: { city: { isRural: false } },
        orderBy: { walkScore: "desc" },
        take: 8,
        select: {
          name: true,
          slug: true,
          highlights: true,
          medianPrice: true,
          walkScore: true,
          city: { select: { name: true, slug: true, stateCode: true } },
          listings: { take: 1, where: { status: { in: ["ACTIVE", "SOLD"] } }, select: { media: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, alt: true, blurDataUrl: true, color: true } } } },
          _count: { select: { listings: true } },
        },
      }),
      db.city.findMany({ where: { slug: { in: SNAPSHOT_CITIES } }, select: { slug: true, name: true, stateCode: true, marketStats: { orderBy: { month: "asc" } } } }),
      db.listing.groupBy({ by: ["category"], where: { status: { in: ["ACTIVE", "COMING_SOON"] } }, _count: { _all: true } }),
    ]);

    const fmtMonth = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const markets: MarketSeries[] = SNAPSHOT_CITIES.map((slug) => cities.find((c) => c.slug === slug))
      .filter(Boolean)
      .map((c) => ({
        slug: c!.slug,
        name: c!.name,
        state: c!.stateCode,
        months: c!.marketStats.map((m) => ({
          label: fmtMonth(m.month),
          list: m.medianListPrice,
          sold: m.medianSoldPrice,
          rent: m.medianRent,
          dom: m.medianDaysOnMarket,
          inventory: m.inventory,
          ppsf: m.medianPricePerSqft,
          saleToList: m.saleToListRatio,
        })),
      }));

    const thirty = rates.find((r) => r.slug === "30-year-fixed");
    return {
      rails: {
        newest: newest.map(toCardData).map(railCard),
        drops: drops.map(toCardData).map(railCard),
        openHouses: openHouses.map(toCardData).map(railCard),
        luxury: luxury.map(toCardData).map(railCard),
        rentals: rentals.map(toCardData).map(railCard),
      },
      rates: rates.map((r) => ({ product: r.product, slug: r.slug, rate: r.rate, apr: r.apr, date: r.date.toISOString() })),
      examplePayment: thirty ? Math.round(monthlyPayment(400_000, thirty.rate, 30)) : null,
      thirtyRate: thirty?.rate ?? null,
      posts: posts.map((p) => ({ ...p, publishedAt: p.publishedAt?.toISOString() ?? null })),
      agents,
      hoods: hoods.map((h) => ({ ...h, photo: h.listings[0]?.media[0] ?? null, listings: undefined })),
      markets,
      counts: Object.fromEntries(counts.map((c) => [c.category, c._count._all])) as Record<string, number>,
    };
  },
  ["home-data-v3"],
  { revalidate: 300, tags: ["listings"] },
);

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
