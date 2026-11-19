import "server-only";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TOOLS } from "@/lib/content/tools";
import { site } from "@/lib/site";
import { MODE_VERTICAL, VERTICALS } from "@/lib/search/verticals";
import { baseModeWhere, HUB_MODES } from "./place-hub";

export interface SitemapEntry {
  path: string;
  /** ISO string: cached results round-trip through JSON, so no Date objects here. */
  lastmod?: string;
  priority?: number;
}

export const LISTINGS_PER_SITEMAP = 10_000;
const LIVE: Prisma.ListingWhereInput = { status: { in: ["ACTIVE", "COMING_SOON", "PENDING"] } };
const iso = (d: Date) => d.toISOString();

/** Main search vertical per mode, using the same filter as the search page, so a place is listed only when it has results (no thin pages). */
const modePages = () => HUB_MODES.map((mode) => ({ vertical: MODE_VERTICAL[mode], where: baseModeWhere(mode) }));

const STATIC_PATHS = [
  "/",
  "/sell",
  "/home-value",
  "/sell/post",
  "/mortgage",
  "/rent",
  "/rent/affordability",
  "/rent/cost-of-living",
  "/rent/trends",
  "/agents",
  "/brokerages",
  "/property-managers",
  "/pro",
  "/learn",
  "/learn/glossary",
  "/about",
  "/legal",
  "/legal/terms",
  "/legal/privacy",
  "/legal/accessibility",
  "/legal/fair-housing",
  "/legal/mls-data",
];

export function staticEntries(): SitemapEntry[] {
  const tools = TOOLS.map((t) => t.href).filter((h) => h.startsWith("/"));
  const verticals = VERTICALS.map((v) => `/${v.slug}`);
  return [...new Set([...STATIC_PATHS, ...verticals, ...tools])].map((path) => ({ path, priority: path === "/" ? 1 : 0.7 }));
}

export const placeEntries = unstable_cache(
  async (): Promise<SitemapEntry[]> => {
    const [states, cities, hoods] = await Promise.all([
      db.state.findMany({ where: { cities: { some: {} } }, select: { slug: true } }),
      db.city.findMany({ select: { id: true, slug: true, updatedAt: true } }),
      db.neighborhood.findMany({ select: { id: true, slug: true, city: { select: { slug: true } } } }),
    ]);
    const out: SitemapEntry[] = [];
    for (const s of states) out.push({ path: `/${s.slug}`, priority: 0.6 }, { path: `/homes-for-sale/${s.slug}`, priority: 0.6 });
    for (const { vertical, where } of modePages()) {
      const byCity = await db.listing.groupBy({ by: ["cityId"], where: { ...where, cityId: { not: null } }, _count: true });
      const withStock = new Set(byCity.filter((r) => r._count > 0).map((r) => r.cityId));
      for (const c of cities) if (withStock.has(c.id)) out.push({ path: `/${vertical}/${c.slug}`, lastmod: iso(c.updatedAt), priority: 0.8 });
      if (vertical === "homes-for-sale" || vertical === "apartments-for-rent") {
        const byHood = await db.listing.groupBy({ by: ["neighborhoodId"], where: { ...where, neighborhoodId: { not: null } }, _count: true });
        const hoodStock = new Set(byHood.filter((r) => r._count > 0).map((r) => r.neighborhoodId));
        for (const h of hoods) if (hoodStock.has(h.id)) out.push({ path: `/${vertical}/${h.city.slug}/${h.slug}`, priority: 0.6 });
      }
    }
    for (const c of cities) out.push({ path: `/${c.slug}`, lastmod: iso(c.updatedAt), priority: 0.8 });
    return out;
  },
  ["sitemap-places-v2"],
  { revalidate: 3600, tags: ["listings", "markets"] },
);

export const listingCount = unstable_cache(async () => db.listing.count({ where: { OR: [LIVE, { status: "SOLD" }] } }), ["sitemap-listing-count-v1"], { revalidate: 3600, tags: ["listings"] });

export const listingEntries = unstable_cache(
  async (chunk: number): Promise<SitemapEntry[]> => {
    const rows = await db.listing.findMany({
      where: { OR: [LIVE, { status: "SOLD" }] },
      orderBy: { id: "asc" },
      skip: chunk * LISTINGS_PER_SITEMAP,
      take: LISTINGS_PER_SITEMAP,
      select: { slug: true, updatedAt: true, status: true },
    });
    return rows.map((r) => ({ path: `/property/${r.slug}`, lastmod: iso(r.updatedAt), priority: r.status === "SOLD" ? 0.3 : 0.6 }));
  },
  ["sitemap-listings-v1"],
  { revalidate: 3600, tags: ["listings"] },
);

export const profileEntries = unstable_cache(
  async (): Promise<SitemapEntry[]> => {
    const [agents, orgs] = await Promise.all([
      db.agent.findMany({ select: { slug: true, updatedAt: true } }),
      db.organization.findMany({ select: { slug: true, type: true, updatedAt: true } }),
    ]);
    return [
      ...agents.map((a) => ({ path: `/agents/${a.slug}`, lastmod: iso(a.updatedAt), priority: 0.5 })),
      ...orgs.map((o) => ({ path: `/${o.type === "BROKERAGE" ? "brokerages" : "property-managers"}/${o.slug}`, lastmod: iso(o.updatedAt), priority: 0.5 })),
    ];
  },
  ["sitemap-profiles-v1"],
  { revalidate: 3600, tags: ["listings"] },
);

export const contentEntries = unstable_cache(
  async (): Promise<SitemapEntry[]> => {
    const posts = await db.post.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } });
    return posts.map((p) => ({ path: `/learn/${p.slug}`, lastmod: iso(p.updatedAt), priority: 0.6 }));
  },
  ["sitemap-content-v1"],
  { revalidate: 3600, tags: ["listings"] },
);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function urlsetXml(entries: SitemapEntry[]): string {
  const body = entries
    .map((e) => `<url><loc>${esc(`${site.url}${e.path}`)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}${e.priority !== undefined ? `<priority>${e.priority.toFixed(1)}</priority>` : ""}</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function indexXml(files: string[]): string {
  const now = new Date().toISOString();
  const body = files.map((f) => `<sitemap><loc>${esc(`${site.url}/sitemaps/${f}`)}</loc><lastmod>${now}</lastmod></sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export async function sitemapFiles(): Promise<string[]> {
  const chunks = Math.max(1, Math.ceil((await listingCount()) / LISTINGS_PER_SITEMAP));
  return ["pages.xml", "places.xml", ...Array.from({ length: chunks }, (_, i) => `listings-${i + 1}.xml`), "profiles.xml", "learn.xml"];
}

export const XML_HEADERS = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" };
