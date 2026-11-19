import type { Metadata } from "next";
import Link from "@/components/app-link";
import { AccountPageHeader, SectionTitle } from "@/components/account/page-header";
import { DailyChart } from "@/components/pro/controls";
import { ResultStat } from "@/components/tools/fields";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { LEAD_TYPE_LABELS } from "@/lib/domain";
import { formatDate, timeAgo } from "@/lib/format";
import { PRO_ROLES } from "@/server/api";
import { requireRole } from "@/server/auth-helpers";
import { applicationScope, getProScope, leadScope, listingScope, tourScope } from "@/server/pro";

export const metadata: Metadata = { title: "Pro dashboard" };

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export default async function AgentOverviewPage() {
  const user = await requireRole(PRO_ROLES, "/agent");
  const scope = await getProScope(user);
  const now = new Date();
  const since = new Date(now.getTime() - 30 * DAY);
  const listings = await db.listing.findMany({ where: listingScope(scope), select: { id: true, status: true } });
  const ids = listings.map((l) => l.id);
  const [events, leads30, recentLeads, tours, pendingApps] = await Promise.all([
    db.analyticsEvent.findMany({ where: { listingId: { in: ids }, type: { in: ["listing_view", "listing_save"] }, createdAt: { gte: since } }, select: { type: true, createdAt: true } }),
    db.lead.findMany({ where: { ...leadScope(scope), createdAt: { gte: since } }, select: { createdAt: true } }),
    db.lead.findMany({ where: leadScope(scope), orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, type: true, status: true, createdAt: true, listing: { select: { slug: true, streetAddress: true } } } }),
    db.tourRequest.findMany({ where: { ...tourScope(scope), status: { in: ["REQUESTED", "CONFIRMED"] }, preferredDate: { gte: new Date(now.getTime() - DAY) } }, orderBy: { preferredDate: "asc" }, take: 5, select: { id: true, name: true, status: true, type: true, preferredDate: true, preferredTime: true, listing: { select: { slug: true, streetAddress: true } } } }),
    db.rentalApplication.count({ where: { ...applicationScope(scope), status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
  ]);

  const days = Array.from({ length: 30 }, (_, i) => new Date(since.getTime() + (i + 1) * DAY));
  const tally = (dates: Date[]) => {
    const m = new Map<string, number>();
    for (const d of dates) m.set(dayKey(d), (m.get(dayKey(d)) ?? 0) + 1);
    return days.map((d) => m.get(dayKey(d)) ?? 0);
  };
  const views = tally(events.filter((e) => e.type === "listing_view").map((e) => e.createdAt));
  const saves = tally(events.filter((e) => e.type === "listing_save").map((e) => e.createdAt));
  const leadsDaily = tally(leads30.map((l) => l.createdAt));
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const active = listings.filter((l) => ["ACTIVE", "COMING_SOON", "PENDING"].includes(l.status)).length;

  return (
    <>
      <AccountPageHeader title={`Welcome back${scope.agent ? `, ${scope.agent.name.split(" ")[0]}` : ""}`} description="Your listings, leads and tours over the last 30 days." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultStat label="New leads · 30 days" value={leads30.length} sub={<Link href="/agent/leads" className="text-primary hover:underline">Open lead inbox</Link>} />
        <ResultStat label="Listing views · 30 days" value={sum(views).toLocaleString("en-US")} sub={`${active} active listing${active === 1 ? "" : "s"}`} />
        <ResultStat label="Saves · 30 days" value={sum(saves).toLocaleString("en-US")} sub="Shoppers who hearted your homes" />
        <ResultStat label="Pending applications" value={pendingApps} sub={<Link href="/agent/applications" className="text-primary hover:underline">Review applications</Link>} />
      </div>

      <section aria-labelledby="trend-title" className="mt-8 rounded-3xl border bg-card p-5">
        <h2 id="trend-title" className="font-semibold">Engagement</h2>
        <p className="mb-3 text-sm text-muted-foreground">Daily views, saves and leads across your listings.</p>
        <DailyChart
          labels={days.map((d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }))}
          series={[
            { key: "views", label: "Views", values: views },
            { key: "saves", label: "Saves", values: saves },
            { key: "leads", label: "Leads", values: leadsDaily },
          ]}
          caption="Daily listing views, saves and leads over the last 30 days"
        />
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="recent-leads">
          <SectionTitle id="recent-leads">Recent leads</SectionTitle>
          {recentLeads.length ? (
            <ul className="divide-y rounded-3xl border bg-card">
              {recentLeads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.name} · <span className="text-muted-foreground">{LEAD_TYPE_LABELS[l.type] ?? l.type}</span></p>
                    <p className="truncate text-xs text-muted-foreground">{l.listing ? l.listing.streetAddress : "General inquiry"} · {timeAgo(l.createdAt, now)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{l.status.charAt(0) + l.status.slice(1).toLowerCase()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">No leads yet.</p>
          )}
        </section>
        <section aria-labelledby="upcoming-tours">
          <SectionTitle id="upcoming-tours">Upcoming tours</SectionTitle>
          {tours.length ? (
            <ul className="divide-y rounded-3xl border bg-card">
              {tours.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.listing.streetAddress}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.name} · {formatDate(t.preferredDate)} {t.preferredTime} · {t.type === "VIDEO" ? "Video" : "In person"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{t.status === "REQUESTED" ? "Needs confirmation" : "Confirmed"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">No upcoming tours.</p>
          )}
          <Button asChild variant="outline" size="sm" className="mt-3"><Link href="/agent/tours">Manage tours</Link></Button>
        </section>
      </div>

      {scope.agent && scope.agent.plan === "FREE" && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm"><span className="font-semibold">Get more leads with Pro.</span> Priority lead routing, a featured profile and listing analytics.</p>
          <Button asChild><Link href="/pro">See plans</Link></Button>
        </div>
      )}
    </>
  );
}
