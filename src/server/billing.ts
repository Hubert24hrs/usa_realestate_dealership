import "server-only";
import { db } from "@/lib/db";
import { PLANS, type PlanKey } from "@/lib/plans";
import { site } from "@/lib/site";
import { createCheckout, stripe, stripeEnabled } from "./payments";

const priceIdFor = (plan: Exclude<PlanKey, "FREE">) => (plan === "PRO" ? process.env.STRIPE_PRICE_AGENT_PRO : process.env.STRIPE_PRICE_AGENT_PREMIER) || null;
const DAY = 86_400_000;

/** Start an upgrade: Stripe subscription Checkout when configured, otherwise the simulated checkout. */
export async function startPlanCheckout(user: { id: string; email: string | null }, agent: { id: string; name: string; email: string; stripeCustomerId: string | null }, plan: Exclude<PlanKey, "FREE">) {
  const amountCents = PLANS[plan].monthly * 100;
  const purchase = await db.purchase.create({ data: { userId: user.id, kind: `agent_plan:${plan}`, referenceId: agent.id, amountCents, status: "PENDING" } });
  const priceId = priceIdFor(plan);
  if (stripeEnabled() && priceId) {
    let customerId = agent.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe().customers.create({ email: user.email ?? agent.email, name: agent.name, metadata: { agentId: agent.id } });
      customerId = customer.id;
      await db.agent.update({ where: { id: agent.id }, data: { stripeCustomerId: customerId } });
    }
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { kind: "agent_plan", referenceId: purchase.id },
      subscription_data: { metadata: { agentId: agent.id, plan } },
      success_url: `${site.url}/agent/billing?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site.url}/pro?canceled=1`,
    });
    await db.purchase.update({ where: { id: purchase.id }, data: { stripeSessionId: session.id } });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return session.url;
  }
  // Same simulated checkout as rent / application fees (only reachable when Stripe is off).
  const { url } = await createCheckout({ kind: "agent_plan", referenceId: purchase.id, amountCents, description: `CITI VIEW ${PLANS[plan].name} plan`, successPath: "/agent/billing?upgraded=1", cancelPath: "/pro?canceled=1" });
  return url;
}

/** Idempotent: mark the purchase paid and switch the agent's plan. */
export async function fulfillAgentPlan(purchaseId: string, opts: { method: string; sessionId?: string | null; subscriptionId?: string | null }) {
  const purchase = await db.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase || purchase.status === "PAID" || !purchase.kind.startsWith("agent_plan:") || !purchase.referenceId) return;
  const plan = purchase.kind.split(":")[1] as PlanKey;
  if (!(plan in PLANS)) return;
  await db.$transaction([
    db.purchase.update({ where: { id: purchase.id }, data: { status: "PAID", ...(opts.sessionId ? { stripeSessionId: opts.sessionId } : {}) } }),
    db.agent.update({
      where: { id: purchase.referenceId },
      data: { plan, leadWeight: PLANS[plan].leadWeight, planRenewsAt: new Date(Date.now() + 30 * DAY), ...(opts.subscriptionId ? { stripeSubscriptionId: opts.subscriptionId } : {}) },
    }),
  ]);
  if (purchase.userId) {
    await db.notification.create({ data: { userId: purchase.userId, type: "SYSTEM", title: `You're on ${PLANS[plan].name}`, body: opts.method === "demo" ? "Simulated upgrade. No charge." : "Thanks for upgrading. Your new benefits are live.", url: "/agent/billing" } });
  }
}

/** Webhook: keep the plan in sync with the Stripe subscription (renewals, plan changes, cancellations). */
export async function syncSubscription(sub: { id: string; status: string; metadata: Record<string, string>; current_period_end?: number | null; cancel_at_period_end?: boolean }) {
  const agentId = sub.metadata?.agentId;
  if (!agentId) return;
  const live = ["active", "trialing", "past_due"].includes(sub.status);
  const plan = (live ? (sub.metadata.plan as PlanKey) : "FREE") ?? "FREE";
  if (!(plan in PLANS)) return;
  await db.agent.updateMany({
    where: { id: agentId },
    data: { plan, leadWeight: PLANS[plan].leadWeight, stripeSubscriptionId: live ? sub.id : null, planRenewsAt: live && sub.current_period_end ? new Date(sub.current_period_end * 1000) : null },
  });
}

/** Stripe customer portal (manage card, cancel). */
export async function billingPortalUrl(customerId: string) {
  const session = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${site.url}/agent/billing` });
  return session.url;
}
