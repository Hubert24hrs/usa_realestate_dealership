import type { Metadata } from "next";
import Link from "@/components/app-link";
import type { Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import { AccountPageHeader } from "@/components/account/page-header";
import { AgentControls } from "@/components/admin/controls";
import { AdminPager } from "@/components/admin/pager";
import { AutoSubmitForm } from "@/components/agents/filter-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Agents" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const PER_PAGE = 25;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export default async function AdminAgentsPage({ searchParams }: PageProps) {
  await requireRole(["ADMIN"], "/admin/agents");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const plan = ["FREE", "PRO", "PREMIER"].includes(one(sp.plan)) ? one(sp.plan) : "";
  const leads = ["on", "off"].includes(one(sp.leads)) ? one(sp.leads) : "";
  const page = Math.max(1, Math.min(200, Number.parseInt(one(sp.page), 10) || 1));
  const where: Prisma.AgentWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { organization: { name: { contains: q, mode: "insensitive" } } }] } : {}),
    ...(plan ? { plan: plan as never } : {}),
    ...(leads ? { acceptingLeads: leads === "on" } : {}),
  };
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [total, agents] = await Promise.all([
    db.agent.count({ where }),
    db.agent.findMany({
      where,
      orderBy: [{ plan: "desc" }, { name: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, slug: true, name: true, email: true, plan: true, acceptingLeads: true, leadWeight: true, rating: true, reviewCount: true, areasServed: true, lastLeadAt: true,
        organization: { select: { name: true } },
        _count: { select: { listings: true, leads: { where: { createdAt: { gte: since } } } } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <AccountPageHeader
        eyebrow="Admin"
        title="Agents & lead routing"
        description="Leads go to the listing agent first, then to agents serving the city by weighted round robin. Weight 0 keeps an agent in the directory without new routed leads. Plan changes here are comps: they don't touch Stripe billing."
      />
      <AutoSubmitForm action="/admin/agents" className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-3">
        <div className="relative min-w-56 flex-1">
          <label htmlFor="agent-q" className="sr-only">Search name, email or brokerage</label>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="agent-q" name="q" defaultValue={q} placeholder="Name, email or brokerage" className="h-9 pl-8" />
        </div>
        <label className="sr-only" htmlFor="agent-plan">Plan</label>
        <select id="agent-plan" name="plan" defaultValue={plan} className={selectCls}>
          <option value="">Any plan</option>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
          <option value="PREMIER">Premier</option>
        </select>
        <label className="sr-only" htmlFor="agent-leads">Lead status</label>
        <select id="agent-leads" name="leads" defaultValue={leads} className={selectCls}>
          <option value="">Receiving leads or paused</option>
          <option value="on">Receiving leads</option>
          <option value="off">Paused</option>
        </select>
        <Button type="submit" variant="outline" className="h-9">Apply</Button>
      </AutoSubmitForm>

      <p className="mb-3 text-sm text-muted-foreground">{total} agent{total === 1 ? "" : "s"}</p>
      <ul className="space-y-3">
        {agents.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-4">
            <div className="min-w-0">
              <Link href={`/agents/${a.slug}`} className="font-semibold hover:underline">{a.name}</Link>
              <p className="text-sm text-muted-foreground">
                {a.organization?.name ?? "Independent"} · {a._count.listings} listings · {a._count.leads} leads (30d) · {a.rating.toFixed(1)}★ ({a.reviewCount})
              </p>
              <p className="truncate text-xs text-muted-foreground">{a.email} · serves {a.areasServed.length ? a.areasServed.join(", ") : "no markets set"}</p>
            </div>
            <AgentControls id={a.id} name={a.name} plan={a.plan} acceptingLeads={a.acceptingLeads} leadWeight={a.leadWeight} />
          </li>
        ))}
      </ul>
      <AdminPager base="/admin/agents" params={{ q, plan, leads }} page={page} pages={pages} />
    </>
  );
}
