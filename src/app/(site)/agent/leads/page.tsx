import type { Metadata } from "next";
import Link from "@/components/app-link";
import { Inbox, Mail, Phone } from "lucide-react";
import { AccountPageHeader, EmptyState } from "@/components/account/page-header";
import { LeadControls } from "@/components/pro/controls";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LEAD_TYPE_LABELS } from "@/lib/domain";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PRO_ROLES } from "@/server/api";
import { requireRole } from "@/server/auth-helpers";
import { getProScope, leadScope } from "@/server/pro";

export const metadata: Metadata = { title: "Leads" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const HIDDEN_KEYS = new Set(["agentNote", "agentNoteAt", "partner"]);
const humanize = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export default async function AgentLeadsPage({ searchParams }: PageProps) {
  const user = await requireRole(PRO_ROLES, "/agent/leads");
  const scope = await getProScope(user);
  const sp = await searchParams;
  const raw = typeof sp.status === "string" ? sp.status.toUpperCase() : "";
  const status = (LEAD_STATUSES as readonly string[]).includes(raw) ? (raw as (typeof LEAD_STATUSES)[number]) : undefined;
  const [leads, counts] = await Promise.all([
    db.lead.findMany({
      where: { ...leadScope(scope), ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, type: true, status: true, name: true, email: true, phone: true, message: true, data: true, createdAt: true, routingReason: true, listing: { select: { slug: true, streetAddress: true, city: true } } },
    }),
    db.lead.groupBy({ by: ["status"], where: leadScope(scope), _count: true }),
  ]);
  const countOf = (s?: string) => (s ? (counts.find((c) => c.status === s)?._count ?? 0) : counts.reduce((a, c) => a + c._count, 0));
  const now = new Date();

  return (
    <>
      <AccountPageHeader title="Leads" description="Every inquiry routed to you. Reply fast — speed is the biggest driver of conversion." />
      <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-1.5">
        {[undefined, ...LEAD_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/agent/leads?status=${s.toLowerCase()}` : "/agent/leads"}
            aria-current={s === status ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", s === status ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}
          >
            {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"} <span className="tabular-nums opacity-70">{countOf(s)}</span>
          </Link>
        ))}
      </nav>
      {leads.length === 0 ? (
        <EmptyState icon={Inbox} title="No leads here">Leads from your listings, your profile and buyer tools will appear here.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => {
            const data = Object.entries((l.data ?? {}) as Record<string, unknown>).filter(([k, v]) => !HIDDEN_KEYS.has(k) && v != null && v !== "" && typeof v !== "object");
            const note = ((l.data ?? {}) as { agentNote?: string }).agentNote ?? "";
            return (
              <li key={l.id} className="grid gap-4 rounded-3xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{l.name}</p>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">{LEAD_TYPE_LABELS[l.type] ?? l.type}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(l.createdAt, now)}</span>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Mail className="size-3.5" aria-hidden /> {l.email}</a>
                    {l.phone && <a href={`tel:${l.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Phone className="size-3.5" aria-hidden /> {l.phone}</a>}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.listing ? <Link href={`/property/${l.listing.slug}`} className="hover:underline">{l.listing.streetAddress}, {l.listing.city}</Link> : "Not about a specific listing"}
                    {l.routingReason ? ` · ${l.routingReason}` : ""}
                  </p>
                  {l.message && <p className="mt-2 line-clamp-3 text-sm">{l.message}</p>}
                  {data.length > 0 && (
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {data.slice(0, 6).map(([k, v]) => <div key={k}><dt className="inline">{humanize(k)}: </dt><dd className="inline font-medium text-foreground">{String(v)}</dd></div>)}
                    </dl>
                  )}
                </div>
                <LeadControls id={l.id} status={l.status} note={note} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
