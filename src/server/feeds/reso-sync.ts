import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { mapResoProperty, type MappedListing, type ResoProperty } from "@/lib/feeds/reso-map";
import { slugify } from "@/lib/format";

/**
 * Licensed MLS / IDX ingestion over the RESO Web API (OData). Works with vendors that use OAuth2
 * client credentials (Bridge, Trestle, Spark, MLS Grid…). Only run it with credentials your
 * brokerage is licensed to use, and display the results under that MLS's IDX rules.
 */
const config = () => ({
  baseUrl: process.env.RESO_API_BASE_URL?.replace(/\/$/, ""),
  tokenUrl: process.env.RESO_TOKEN_URL,
  clientId: process.env.RESO_CLIENT_ID,
  clientSecret: process.env.RESO_CLIENT_SECRET,
  originatingSystem: process.env.RESO_ORIGINATING_SYSTEM || "mls",
});

export const feedConfigured = () => {
  const c = config();
  return Boolean(c.baseUrl && c.tokenUrl && c.clientId && c.clientSecret);
};

const LAST_SYNC_KEY = "feed.lastSync";
const PAGE_SIZE = 200;
const STATUSES = ["Active", "Active Under Contract", "Pending", "Coming Soon", "Closed", "Canceled", "Expired", "Withdrawn"];

async function accessToken(): Promise<string> {
  const c = config();
  const res = await fetch(c.tokenUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: c.clientId!, client_secret: c.clientSecret!, scope: "api" }),
  });
  if (!res.ok) throw new Error(`RESO token request failed (${res.status})`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function getJson(url: string, token: string, attempt = 0): Promise<{ value: ResoProperty[]; "@odata.nextLink"?: string }> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const wait = Number(res.headers.get("retry-after")) * 1000 || 2 ** attempt * 1_000;
    await new Promise((r) => setTimeout(r, wait));
    return getJson(url, token, attempt + 1);
  }
  if (!res.ok) throw new Error(`RESO request failed (${res.status}) for ${new URL(url).pathname}`);
  return res.json();
}

export interface FeedSyncOptions {
  /** Only records modified after this time (incremental). Defaults to the last successful sync. */
  since?: Date | null;
  /** Full sync: also takes feed listings that are no longer in the feed off market. */
  full?: boolean;
  /** Map and count, but write nothing. */
  dryRun?: boolean;
  /** Stop after this many records (testing). */
  limit?: number;
}

export interface FeedSyncSummary {
  fetched: number;
  created: number;
  updated: number;
  skipped: Array<{ key: string; reason: string }>;
  offMarket: number;
  unmatchedCities: string[];
  since: string | null;
  dryRun: boolean;
}

const LIVE = new Set(["ACTIVE", "COMING_SOON", "PENDING"]);

/** Deterministic ~300–700 m offset so a withheld address can't be read off the map pin. */
function blurPoint(seed: string, lat: number, lng: number) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const angle = ((h >>> 0) % 360) * (Math.PI / 180);
  const dist = 0.003 + (((h >>> 9) % 1000) / 1000) * 0.0035; // degrees of latitude
  return { lat: lat + Math.sin(angle) * dist, lng: lng + (Math.cos(angle) * dist) / Math.cos((lat * Math.PI) / 180) };
}

/** URL slug; a withheld street address never goes into the URL. */
const slugFor = (m: MappedListing) =>
  `${slugify(m.hideAddress ? `${m.propertyType.replace(/_/g, " ")} ${m.city} ${m.state} ${m.zip}` : `${m.streetAddress}${m.unit ? ` unit ${m.unit}` : ""} ${m.city} ${m.state} ${m.zip}`)}-${randomBytes(2).toString("hex")}`;

async function upsert(m: MappedListing, cityId: string | null, neighborhoodId: string | null, now: Date) {
  const existing = await db.listing.findUnique({ where: { feedKey: m.feedKey }, select: { id: true, slug: true, price: true, status: true, originalPrice: true } });
  const { media, feedKey, ...fields } = m;
  const point = m.hideAddress ? blurPoint(feedKey, m.lat, m.lng) : { lat: m.lat, lng: m.lng };
  const data = { ...fields, ...point, source: "FEED" as const, isDemo: false, cityId, neighborhoodId, isFsbo: false };
  const mediaRows = (listingId: string): Prisma.ListingMediaCreateManyInput[] =>
    media.map((img, i) => ({
      listingId,
      type: img.category === "FLOOR_PLAN" ? "FLOOR_PLAN" : "PHOTO",
      category: img.category,
      url: img.url,
      width: img.width,
      height: img.height,
      alt: img.alt,
      sortOrder: i,
      isPrimary: i === 0,
      provider: "FEED",
      providerId: img.providerId,
      license: img.license,
    }));

  if (!existing) {
    const created = await db.listing.create({ data: { ...data, slug: slugFor(m), feedKey }, select: { id: true } });
    await db.$transaction([
      db.listingMedia.createMany({ data: mediaRows(created.id), skipDuplicates: true }),
      db.priceHistory.create({ data: { listingId: created.id, date: m.listDate, event: "LISTED", price: m.originalPrice ?? m.price, source: "MLS" } }),
    ]);
    return "created" as const;
  }

  const events: Prisma.PriceHistoryCreateManyInput[] = [];
  const update: Prisma.ListingUncheckedUpdateInput = { ...data };
  // The seller withheld the address after we first published it: move the listing to a street-free URL.
  if (m.hideAddress && existing.slug.startsWith(slugify(m.streetAddress))) update.slug = slugFor(m);
  if (m.price !== existing.price && LIVE.has(m.status)) {
    events.push({ listingId: existing.id, date: now, event: "PRICE_CHANGE", price: m.price, source: "MLS" });
    if (m.price < existing.price) Object.assign(update, { priceReducedAt: now, priceReduction: existing.price - m.price });
  }
  if (m.status !== existing.status) {
    const event = m.status === "SOLD" ? "SOLD" : m.status === "PENDING" ? "PENDING" : m.status === "OFF_MARKET" ? "DELISTED" : existing.status === "OFF_MARKET" && m.status === "ACTIVE" ? "RELISTED" : null;
    if (event) events.push({ listingId: existing.id, date: m.soldDate ?? now, event, price: m.price, source: "MLS" });
  }
  await db.$transaction([
    db.listing.update({ where: { id: existing.id }, data: update }),
    db.priceHistory.createMany({ data: events }),
    // The feed is the source of truth for photos: replace them on every update.
    db.listingMedia.deleteMany({ where: { listingId: existing.id, provider: "FEED" } }),
    db.listingMedia.createMany({ data: mediaRows(existing.id), skipDuplicates: true }),
  ]);
  return "updated" as const;
}

/** Pull Property records (with Media) from the RESO Web API and upsert them as FEED listings. */
export async function syncResoFeed(opts: FeedSyncOptions = {}): Promise<FeedSyncSummary> {
  if (!feedConfigured()) throw new Error("RESO feed is not configured. Set RESO_API_BASE_URL, RESO_TOKEN_URL, RESO_CLIENT_ID and RESO_CLIENT_SECRET.");
  const c = config();
  const started = new Date();
  const lastRow = opts.full || opts.since !== undefined ? null : await db.siteSetting.findUnique({ where: { key: LAST_SYNC_KEY } });
  const since = opts.full ? null : (opts.since ?? (lastRow ? new Date(String(lastRow.value)) : null));
  const summary: FeedSyncSummary = { fetched: 0, created: 0, updated: 0, skipped: [], offMarket: 0, unmatchedCities: [], since: since?.toISOString() ?? null, dryRun: Boolean(opts.dryRun) };

  const filters = [`StandardStatus in (${STATUSES.map((s) => `'${s}'`).join(",")})`];
  if (since) filters.push(`ModificationTimestamp gt ${since.toISOString()}`);
  const first = new URL(`${c.baseUrl}/Property`);
  first.searchParams.set("$filter", filters.join(" and "));
  first.searchParams.set("$expand", "Media");
  first.searchParams.set("$top", String(PAGE_SIZE));
  first.searchParams.set("$orderby", "ModificationTimestamp asc");

  const token = await accessToken();
  const cityCache = new Map<string, { id: string; hoods: Array<{ id: string; lat: number; lng: number; r: number }> } | null>();
  const unmatched = new Set<string>();
  const seen = new Set<string>();
  let next: string | undefined = first.toString();

  while (next && (!opts.limit || summary.fetched < opts.limit)) {
    const page = await getJson(next, token);
    for (const record of page.value) {
      if (opts.limit && summary.fetched >= opts.limit) break;
      summary.fetched++;
      const mapped = mapResoProperty(record, c.originatingSystem);
      if (!mapped.ok) {
        summary.skipped.push({ key: record.ListingKey, reason: mapped.reason });
        // An opt-out or withdrawal that we already show must come down.
        if (!opts.dryRun) await db.listing.updateMany({ where: { feedKey: `${c.originatingSystem}:${record.ListingKey}`, status: { not: "OFF_MARKET" } }, data: { status: "OFF_MARKET" } });
        continue;
      }
      const m = mapped.listing;
      seen.add(m.feedKey);
      const cityKey = `${m.city.toLowerCase()}|${m.state}`;
      if (!cityCache.has(cityKey)) {
        const city = await db.city.findFirst({ where: { name: { equals: m.city, mode: "insensitive" }, stateCode: m.state }, select: { id: true, neighborhoods: { select: { id: true, centerLat: true, centerLng: true, radiusDeg: true } } } });
        cityCache.set(cityKey, city ? { id: city.id, hoods: city.neighborhoods.map((h) => ({ id: h.id, lat: h.centerLat, lng: h.centerLng, r: h.radiusDeg })) } : null);
      }
      const city = cityCache.get(cityKey) ?? null;
      if (!city) unmatched.add(`${m.city}, ${m.state}`);
      const hood = city?.hoods.find((h) => Math.hypot(h.lat - m.lat, h.lng - m.lng) <= h.r) ?? null;
      if (opts.dryRun) continue;
      const result = await upsert(m, city?.id ?? null, hood?.id ?? null, started);
      summary[result]++;
    }
    next = page["@odata.nextLink"];
  }

  if (!opts.dryRun) {
    if (opts.full && !opts.limit) {
      const gone = await db.listing.updateMany({ where: { source: "FEED", feedKey: { notIn: [...seen] }, status: { in: ["ACTIVE", "COMING_SOON", "PENDING"] } }, data: { status: "OFF_MARKET" } });
      summary.offMarket = gone.count;
    }
    await db.siteSetting.upsert({ where: { key: LAST_SYNC_KEY }, create: { key: LAST_SYNC_KEY, value: started.toISOString() }, update: { value: started.toISOString() } });
  }
  summary.unmatchedCities = [...unmatched].sort();
  return summary;
}
