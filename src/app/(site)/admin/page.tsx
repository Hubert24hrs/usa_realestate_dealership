import type { Metadata } from "next";
import Link from "@/components/app-link";
import { AccountPageHeader, SectionTitle } from "@/components/account/page-header";
import { DailyChart } from "@/components/pro/controls";
import { ResultStat } from "@/components/tools/fields";
import { db } from "@/lib/db";
import { LEAD_TYPE_LABELS, REPORT_REASON_LABELS } from "@/lib/domain";
import { formatMoney, formatNumber, timeAgo } from "@/lib/format";
import { requireRole } from "@/server/auth-helpers";

// A layout's title template applies to child segments only, so this page sets its full title.
export const metadata: Metadata = { title: "Admin overview" };

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export default async function AdminOverviewPage() {
  await requireRole(["ADMIN"], "/admin");
  const now = new Date();
  const since = new Date(now.getTime() - 30 * DAY);
  const [byStatus, users30, leads30, listings30, revenue, rentCollected, agents, openReports, recentReports, recentLeads, recentFsbo] = await Promise.all([
    db.listing.groupBy({ by: ["status"], _count: true }),
    db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.lead.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, agentId: true } }),
    db.listing.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.purchase.aggregate({ where: { status: "PAID", createdAt: { gte: since } }, _sum: { amountCents: true } }),
    db.rentPayment.aggregate({ where: { status: "PAID", paidAt: { gte: since } }, _sum: { amountCents: true } }),
    db.agent.groupBy({ by: ["plan"], _count: true }),
    db.report.count({ where: { status: "OPEN" } }),
    db.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, reason: true, createdAt: true, listing: { select: { slug: true, streetAddress: true, city: true } } } }),
    db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, type: true, createdAt: true, agent: { select: { name: true } }, routingReason: true } }),
    db.listing.findMany({ where: { source: "FSBO" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, slug: true, streetAddress: true, city: true, state: true, status: true, createdAt: true } }),
  ]);

  const count = (s: string) => byStatus.find((r) => r.status === s)?._count ?? 0;
  const live = count("ACTIVE") + count("COMING_SOON") + count("PENDING");
  const days = Array.from({ length: 30 }, (_, i) => new Date(since.getTime() + (i + 1) * DAY));
  const tally = (dates: Date[]) => {
    const m = new Map<string, number>();
    for (const d of dates) m.set(dayKey(d), (m.get(dayKey(d)) ?? 0) + 1);
    return days.map((d) => m.get(dayKey(d)) ?? 0);
  };
  const paidAgents = agents.filter((a) => a.plan !== "FREE").reduce((s, a) => s + a._count, 0);
  const totalAgents = agents.reduce((s, a) => s + a._count, 0);
  const unassigned = leads30.filter((l) => !l.agentId).length;

  return (
    <>
      <AccountPageHeader eyebrow="Admin" title="Marketplace overview" description="Inventory, demand and moderation across CITI VIEW — last 30 days." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultStat label="Live listings" value={formatNumber(live)} sub={<Link href="/admin/listings?status=DRAFT" className="text-primary hover:underline">{count("DRAFT")} drafts awaiting review</Link>} />
        <ResultStat label="Leads · 30 days" value={formatNumber(leads30.length)} sub={unassigned ? <Link href="/admin/leads?agent=none" className="text-primary hover:underline">{unassigned} went to the concierge queue</Link> : "All routed to agents or owners"} />
        <ResultStat label="Revenue · 30 days" value={formatMoney((revenue._sum.amountCents ?? 0) / 100)} sub={`Plans & fees · ${formatMoney((rentCollected._sum.amountCents ?? 0) / 100)} rent collected`} />
        <ResultStat label="Open reports" value={openReports} sub={<Link href="/admin/reports" className="text-primary hover:underline">Review the moderation queue</Link>} />
      </div>

      <section aria-labelledby="growth-title" className="mt-8 rounded-3xl border bg-card p-5">
        <h2 id="growth-title" className="font-semibold">Activity</h2>
        <p className="mb-3 text-sm text-muted-foreground">New sign-ups, leads and listings per day. {paidAgents} of {totalAgents} agents are on a paid plan.</p>
        <DailyChart
          labels={days.map((d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }))}
          series={[
            { key: "signups", label: "Sign-ups", values: tally(users30.map((u) => u.createdAt)) },
            { key: "leads", label: "Leads", values: tally(leads30.map((l) => l.createdAt)) },
            { key: "listings", label: "New listings", values: tally(listings30.map((l) => l.createdAt)) },
          ]}
          caption="Daily sign-ups, leads and new listings over the last 30 days"
        />
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-3">
        <section aria-labelledby="recent-reports">
          <SectionTitle id="recent-reports" action={<Link href="/admin/reports" className="text-sm text-primary hover:underline">All reports</Link>}>Open reports</SectionTitle>
          {recentReports.length ? (
            <ul className="divide-y rounded-3xl border bg-card">
              {recentReports.map((r) => (
                <li key={r.id} className="p-4 text-sm">
                  <p className="truncate font-medium">{REPORT_REASON_LABELS[r.reason] ?? r.reason}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <Link href={`/property/${r.listing.slug}`} className="hover:underline">{r.listing.streetAddress}, {r.listing.city}</Link> · {timeAgo(r.createdAt, now)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">Nothing to review.</p>
          )}
        </section>
        <section aria-labelledby="recent-leads">
          <SectionTitle id="recent-leads" action={<Link href="/admin/leads" className="text-sm text-primary hover:underline">All leads</Link>}>Latest leads</SectionTitle>
          <ul className="divide-y rounded-3xl border bg-card">
            {recentLeads.map((l) => (
              <li key={l.id} className="p-4 text-sm">
                <p className="truncate font-medium">{l.name} · <span className="text-muted-foreground">{LEAD_TYPE_LABELS[l.type] ?? l.type}</span></p>
                <p className="truncate text-xs text-muted-foreground">{l.agent ? `→ ${l.agent.name}` : (l.routingReason ?? "Unassigned")} · {timeAgo(l.createdAt, now)}</p>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="recent-fsbo">
          <SectionTitle id="recent-fsbo" action={<Link href="/admin/listings?source=FSBO" className="text-sm text-primary hover:underline">All FSBO</Link>}>New owner listings</SectionTitle>
          {recentFsbo.length ? (
            <ul className="divide-y rounded-3xl border bg-card">
              {recentFsbo.map((l) => (
                <li key={l.id} className="p-4 text-sm">
                  <Link href={`/admin/listings/${l.id}`} className="block truncate font-medium hover:underline">{l.streetAddress}, {l.city}, {l.state}</Link>
                  <p className="truncate text-xs text-muted-foreground">{l.status.charAt(0) + l.status.slice(1).toLowerCase().replace("_", " ")} · {timeAgo(l.createdAt, now)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">No owner listings yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
