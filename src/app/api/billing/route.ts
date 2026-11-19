import { z } from "zod";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { badRequest, readJson } from "@/lib/security/request";
import { withRole } from "@/server/api";
import { billingPortalUrl, startPlanCheckout } from "@/server/billing";
import { stripeEnabled } from "@/server/payments";

export const runtime = "nodejs";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("upgrade"), plan: z.enum(["PRO", "PREMIER"]) }),
  z.object({ action: z.literal("portal") }),
  z.object({ action: z.literal("downgrade") }),
]);

/** Agent plan changes: Stripe Checkout / customer portal, or simulated changes when Stripe is off. */
export const POST = withRole(
  ["AGENT", "BROKER"],
  async ({ request, user }) => {
    const body = await readJson(request, Body, 500);
    if (!body.ok) return body.response;
    const agent = await db.agent.findUnique({ where: { userId: user.id }, select: { id: true, name: true, email: true, plan: true, stripeCustomerId: true, stripeSubscriptionId: true } });
    if (!agent) return badRequest("Plans are for agents with a CITI VIEW profile.");

    if (body.data.action === "upgrade") {
      if (agent.plan === body.data.plan) return badRequest(`You're already on ${PLANS[agent.plan].name}.`);
      if (stripeEnabled() && agent.stripeSubscriptionId) {
        // Existing subscribers change plans in the customer portal (prorations handled by Stripe).
        return Response.json({ redirect: await billingPortalUrl(agent.stripeCustomerId!) });
      }
      return Response.json({ redirect: await startPlanCheckout(user, agent, body.data.plan) });
    }
    if (body.data.action === "portal") {
      if (!stripeEnabled() || !agent.stripeCustomerId) return badRequest("No billing account yet.");
      return Response.json({ redirect: await billingPortalUrl(agent.stripeCustomerId) });
    }
    // Downgrade: real subscriptions are cancelled in the portal; the simulated plan resets directly.
    if (stripeEnabled() && agent.stripeCustomerId) return Response.json({ redirect: await billingPortalUrl(agent.stripeCustomerId) });
    await db.agent.update({ where: { id: agent.id }, data: { plan: "FREE", leadWeight: PLANS.FREE.leadWeight, planRenewsAt: null } });
    return Response.json({ redirect: "/agent/billing?downgraded=1" });
  },
  { limit: 10, bucket: "billing" },
);
