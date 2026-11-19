import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AccountPageHeader, SectionTitle } from "@/components/account/page-header";
import { PlanButton } from "@/components/pro/plan-button";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { PRO_ROLES } from "@/server/api";
import { requireRole } from "@/server/auth-helpers";
import { stripeEnabled } from "@/server/payments";
import { confirmCheckout } from "@/server/rentals";

export const metadata: Metadata = { title: "Plan & billing" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BillingPage({ searchParams }: PageProps) {
  const user = await requireRole(PRO_ROLES, "/agent/billing");
  const sp = await searchParams;
  if (typeof sp.session_id === "string") await confirmCheckout(sp.session_id, user.id).catch(() => false);
  const agent = await db.agent.findUnique({ where: { userId: user.id }, select: { id: true, plan: true, planRenewsAt: true, stripeCustomerId: true, leadWeight: true } });
  if (!agent) redirect("/agent");
  const purchases = await db.purchase.findMany({ where: { userId: user.id, kind: { startsWith: "agent_plan:" }, status: "PAID" }, orderBy: { createdAt: "desc" }, take: 12 });
  const plan = PLANS[agent.plan];

  return (
    <>
      <AccountPageHeader title="Plan & billing" description="Your CITI VIEW plan and payment history." />
      {sp.upgraded === "1" && <p role="status" className="mb-6 flex items-center gap-2 rounded-2xl bg-success/10 p-4 text-sm"><CheckCircle2 className="size-4 text-success" aria-hidden /> Your plan is updated — new benefits are live.</p>}
      {sp.downgraded === "1" && <p role="status" className="mb-6 rounded-2xl bg-muted p-4 text-sm">You&apos;re on the Free plan.</p>}
      <section className="rounded-3xl border bg-card p-6">
        <p className="eyebrow">Current plan</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-3xl font-semibold">{plan.name}</p>
            <p className="text-sm text-muted-foreground">
              {plan.monthly ? `${formatMoney(plan.monthly)}/month` : "Free forever"}
              {agent.planRenewsAt ? ` · renews ${formatDate(agent.planRenewsAt)}` : ""} · lead routing weight ×{agent.leadWeight}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link href="/pro">{agent.plan === "PREMIER" ? "Compare plans" : "Upgrade"}</Link></Button>
            {stripeEnabled() && agent.stripeCustomerId && <PlanButton action="portal" variant="outline">Manage billing</PlanButton>}
          </div>
        </div>
        <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          {plan.features.map((f) => <li key={f} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}</li>)}
        </ul>
      </section>
      <section aria-labelledby="payments" className="mt-8">
        <SectionTitle id="payments">Payment history</SectionTitle>
        {purchases.length ? (
          <ul className="divide-y rounded-3xl border bg-card text-sm">
            {purchases.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                <span>{PLANS[(p.kind.split(":")[1] ?? "PRO") as keyof typeof PLANS]?.name ?? "Plan"} plan · {formatDate(p.createdAt)}</span>
                <span className="tabular-nums">{formatMoney(p.amountCents / 100, true)}{p.stripeSessionId ? "" : " (simulated)"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">No payments yet.</p>
        )}
      </section>
    </>
  );
}
