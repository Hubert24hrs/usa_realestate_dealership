import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatCompactPrice, formatPrice } from "@/lib/format";
import { SearchFiltersSchema, type SearchFilters } from "@/lib/search/filters";
import { site } from "@/lib/site";
import { emailLayout, sendEmail } from "./email";
import { pushToUser } from "./push";
import { getSearchProvider } from "./search/provider";

const HOUR = 3_600_000;

/** Every listing id currently matching a saved search (map points cover up to 2,000). */
export async function matchingListingIds(filters: SearchFilters): Promise<string[]> {
  const provider = await getSearchProvider();
  const result = await provider.search({ ...filters, page: 1 }, { pageSize: 1, withFacets: false, withPoints: true });
  return result.points.map((p) => p.id);
}

/** Current match count for a saved search, plus how many weren't in the last alert's baseline. */
export async function savedSearchStatus(filters: SearchFilters, known: string[]): Promise<{ total: number; fresh: number }> {
  const provider = await getSearchProvider();
  const result = await provider.search({ ...filters, page: 1 }, { pageSize: 1, withFacets: false, withPoints: true });
  const seen = new Set(known);
  return { total: result.total, fresh: result.points.filter((p) => !seen.has(p.id)).length };
}

function isDue(frequency: string, last: Date | null, now: Date): boolean {
  if (frequency === "NONE") return false;
  if (!last) return true;
  const age = now.getTime() - last.getTime();
  if (frequency === "INSTANT") return true;
  if (frequency === "DAILY") return age >= 23 * HOUR;
  return age >= 6.9 * 24 * HOUR;
}

export interface AlertRunSummary {
  searchesChecked: number;
  alertsSent: number;
  newMatches: number;
  priceDrops: number;
}

/** Saved-search alerts + favorite price-drop alerts. Run from cron (/api/cron/alerts) or `npm run alerts:run`. */
export async function runAlerts(now = new Date()): Promise<AlertRunSummary> {
  const summary: AlertRunSummary = { searchesChecked: 0, alertsSent: 0, newMatches: 0, priceDrops: 0 };
  const searches = await db.savedSearch.findMany({
    where: { frequency: { not: "NONE" } },
    include: { user: { select: { id: true, email: true, name: true, notificationPrefs: true } } },
  });

  for (const s of searches) {
    if (!isDue(s.frequency, s.lastCheckedAt, now)) continue;
    summary.searchesChecked++;
    const parsed = SearchFiltersSchema.safeParse(s.filters);
    if (!parsed.success) continue;
    const current = await matchingListingIds(parsed.data);
    const known = new Set(s.knownListingIds);
    const fresh = current.filter((id) => !known.has(id));
    await db.savedSearch.update({
      where: { id: s.id },
      data: { knownListingIds: current.slice(0, 2000), lastCheckedAt: now, ...(fresh.length ? { lastNotifiedAt: now } : {}) },
    });
    if (!fresh.length) continue;
    summary.newMatches += fresh.length;
    summary.alertsSent++;
    const homes = await db.listing.findMany({ where: { id: { in: fresh.slice(0, 5) } }, select: { slug: true, streetAddress: true, city: true, state: true, price: true, beds: true, baths: true, transactionType: true } });
    const title = `${fresh.length} new ${fresh.length === 1 ? "home matches" : "homes match"} “${s.name}”`;
    await db.notification.create({ data: { userId: s.userId, type: "ALERT_MATCH", title, url: s.path } });
    const prefs = s.user.notificationPrefs;
    if (s.emailEnabled && s.user.email && (prefs?.emailListingAlerts ?? true)) {
      await sendEmail({
        to: s.user.email,
        subject: title,
        html: emailLayout({
          title,
          intro: "Here are the newest listings that match your saved search.",
          rows: homes.map((h) => [`${formatCompactPrice(h.price)}${h.transactionType === "RENT" ? "/mo" : ""}`, `${h.streetAddress}, ${h.city}, ${h.state}${h.beds != null ? ` · ${h.beds} bd` : ""}`] as [string, string]),
          cta: { label: "See all matches", url: `${site.url}${s.path}` },
          footnote: "You're receiving this because you saved a search on CITI VIEW. Change the frequency or unsubscribe in your saved searches.",
        }),
      });
    }
    if (s.pushEnabled && prefs?.pushListingAlerts) await pushToUser(s.userId, { title, body: homes[0] ? `${formatPrice(homes[0].price)} · ${homes[0].streetAddress}` : undefined, url: s.path });
  }

  // Price drops on saved homes since the last run (24h window), once per user + listing + reduction.
  const since = new Date(now.getTime() - 24 * HOUR);
  const reduced = await db.favorite.findMany({
    where: { listing: { priceReducedAt: { gte: since }, status: "ACTIVE" } },
    include: { listing: { select: { id: true, slug: true, streetAddress: true, price: true, priceReduction: true, priceReducedAt: true } }, user: { select: { id: true, email: true, notificationPrefs: true } } },
  });
  for (const f of reduced) {
    const url = `/property/${f.listing.slug}`;
    const exists = await db.notification.findFirst({ where: { userId: f.userId, type: "PRICE_DROP", url, createdAt: { gte: f.listing.priceReducedAt ?? since } } as Prisma.NotificationWhereInput });
    if (exists) continue;
    summary.priceDrops++;
    const title = `Price cut: ${f.listing.streetAddress} is now ${formatPrice(f.listing.price)}`;
    await db.notification.create({ data: { userId: f.userId, type: "PRICE_DROP", title, body: f.listing.priceReduction ? `Down ${formatPrice(f.listing.priceReduction)}` : undefined, url } });
    if (f.user.email && (f.user.notificationPrefs?.emailPriceDrops ?? true)) {
      await sendEmail({ to: f.user.email, subject: title, html: emailLayout({ title, intro: "A home you saved just dropped its price.", cta: { label: "View the home", url: `${site.url}${url}` } }) });
    }
    if (f.user.notificationPrefs?.pushListingAlerts) await pushToUser(f.userId, { title, url });
  }
  return summary;
}
