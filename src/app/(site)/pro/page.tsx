import type { Metadata } from "next";
import Link from "@/components/app-link";
import { Check } from "lucide-react";
import { PlanButton } from "@/components/pro/plan-button";
import { PageHero } from "@/components/tools/page-hero";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { PLANS, type PlanKey } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/server/auth-helpers";
import { stripeEnabled } from "@/server/payments";

export const metadata: Metadata = {
  title: "CITI VIEW Pro: plans for real estate agents",
  description: "Get more buyer and seller leads, featured placement and listing analytics with CITI VIEW Pro and Premier plans for agents.",
  alternates: { canonical: "/pro" },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ProPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const agent = user ? await db.agent.findUnique({ where: { userId: user.id }, select: { plan: true } }) : null;
  const isAgent = Boolean(agent);
  const order: PlanKey[] = ["FREE", "PRO", "PREMIER"];
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Agents", href: "/agents" }, { name: "Pro plans", href: "/pro" }]}
        eyebrow="CITI VIEW Pro"
        title="Grow your business with CITI VIEW"
        description="Every agent gets a free profile and the leads from their own listings. Upgrade for a bigger share of buyer and seller leads in your markets."
      />
      <div className="container-page py-10">
        {sp.canceled === "1" && <p role="status" className="mb-6 rounded-2xl bg-warning/15 p-4 text-sm">Checkout canceled — your plan hasn&apos;t changed.</p>}
        <ul className="grid gap-4 lg:grid-cols-3">
          {order.map((key) => {
            const p = PLANS[key];
            const current = agent?.plan === key;
            const highlight = key === "PRO";
            return (
              <li key={key} className={cn("flex flex-col rounded-3xl border bg-card p-6", highlight && "border-primary ring-1 ring-primary")}>
                {highlight && <p className="mb-2 self-start rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">Most popular</p>}
                <h2 className="font-display text-2xl font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                <p className="mt-4"><span className="text-4xl font-semibold tabular-nums">${p.monthly}</span><span className="text-muted-foreground">/month</span></p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}</li>)}
                </ul>
                <div className="mt-6">
                  {current ? (
                    <Button variant="outline" className="w-full" disabled>Your current plan</Button>
                  ) : isAgent ? (
                    key === "FREE" ? (
                      <PlanButton action="downgrade" variant="outline" className="w-full">Switch to Free</PlanButton>
                    ) : (
                      <PlanButton action="upgrade" plan={key} variant={highlight ? "default" : "outline"} className="w-full">Upgrade to {p.name}</PlanButton>
                    )
                  ) : user ? (
                    <Button asChild variant="outline" className="w-full"><Link href="/agents">Plans are for agent accounts</Link></Button>
                  ) : (
                    <Button asChild variant={highlight ? "default" : "outline"} className="w-full"><Link href="/sign-in?callbackUrl=%2Fpro">Sign in as an agent</Link></Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 max-w-3xl text-xs text-muted-foreground">
          Plans renew monthly; cancel anytime. Featured placement is always labelled as such, and plans never affect ratings or reviews. Lead weighting applies to inquiries not tied to a specific agent&apos;s listing.{" "}
          {stripeEnabled() ? "Payments are processed securely by Stripe." : "Demo mode: upgrades use a simulated checkout — no card is charged."}
        </p>
      </div>
    </>
  );
}
