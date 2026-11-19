import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AccountPageHeader } from "@/components/account/page-header";
import { LeadAssign } from "@/components/admin/controls";
import { AdminPager } from "@/components/admin/pager";
import { AutoSubmitForm } from "@/components/agents/filter-form";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LEAD_TYPE_LABELS } from "@/lib/domain";
import { timeAgo } from "@/lib/format";
import { requireRole } from "@/server/auth-helpers";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Leads" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const PER_PAGE = 25;
const STATUSES: readonly string[] = LEAD_STATUSES;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  await requireRole(["ADMIN"], "/admin/leads");
  const sp = await searchParams;
  const status = STATUSES.includes(one(sp.status)) ? one(sp.status) : "";
  const type = one(sp.type) in LEAD_TYPE_LABELS ? one(sp.type) : "";
  const agent = one(sp.agent) === "none" ? "none" : "";
  const page = Math.max(1, Math.min(400, Number.parseInt(one(sp.page), 10) || 1));
  const where: Prisma.LeadWhereInput = {
    ...(status ? { status: status as never } : {}),
    ...(type ? { type: type as never } : {}),
    // Concierge queue: no agent and not an owner-routed FSBO lead.
    ...(agent === "none" ? { agentId: null, OR: [{ listingId: null }, { listing: { isFsbo: false } }] } : {}),
  };
  const [total, leads, agents, settings] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, type: true, status: true, name: true, email: true, phone: true, message: true, createdAt: true, routingReason: true, agentId: true,
        listing: { select: { slug: true, streetAddress: true, city: true, isFsbo: true } },
      },
    }),
    db.agent.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getSettings(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const now = new Date();
  const slaMs = settings.leadRouting.slaMinutes * 60_000;

  return (
    <>
      <AccountPageHeader
        eyebrow="Admin"
        title="Leads"
        description={`Every inquiry across the marketplace. New leads older than the ${settings.leadRouting.slaMinutes}-minute response target are flagged so you can reassign them.`}
      />
      <AutoSubmitForm action="/admin/leads" className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-3">
        <label className="sr-only" htmlFor="lead-status">Status</label>
        <select id="lead-status" name="status" defaultValue={status} className={selectCls}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
        <label className="sr-only" htmlFor="lead-type">Type</label>
        <select id="lead-type" name="type" defaultValue={type} className={selectCls}>
          <option value="">Any type</option>
          {Object.entries(LEAD_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label className="sr-only" htmlFor="lead-agent">Assignment</label>
        <select id="lead-agent" name="agent" defaultValue={agent} className={selectCls}>
          <option value="">Any assignment</option>
          <option value="none">Concierge queue (unassigned)</option>
        </select>
        <Button type="submit" variant="outline" className="h-9">Apply</Button>
      </AutoSubmitForm>

      <p className="mb-3 text-sm text-muted-foreground">{total.toLocaleString("en-US")} lead{total === 1 ? "" : "s"}</p>
      <ul className="space-y-3">
        {leads.map((l) => {
          const late = l.status === "NEW" && now.getTime() - l.createdAt.getTime() > slaMs;
          return (
            <li key={l.id} className="rounded-3xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {l.name} <span className="font-normal text-muted-foreground">· {LEAD_TYPE_LABELS[l.type] ?? l.type}</span>
                    {late && <span className="ml-2 rounded-full bg-copper-500/15 px-2 py-0.5 text-xs font-medium text-copper-700 dark:text-copper-300">Past response target</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>{l.phone ? ` · ${l.phone}` : ""} · {timeAgo(l.createdAt, now)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {l.listing ? <Link href={`/property/${l.listing.slug}`} className="hover:underline">{l.listing.streetAddress}, {l.listing.city}</Link> : "General inquiry"} · {l.routingReason ?? "Unrouted"}
                  </p>
                  {l.message && <p className="mt-2 line-clamp-2 max-w-2xl text-sm">{l.message}</p>}
                </div>
                {l.listing?.isFsbo && !l.agentId ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Sent to owner</span>
                ) : (
                  <LeadAssign id={l.id} agentId={l.agentId} status={l.status} agents={agents} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <AdminPager base="/admin/leads" params={{ status, type, agent }} page={page} pages={pages} />
    </>
  );
}
