import type Stripe from "stripe";
import { badRequest } from "@/lib/security/request";
import { syncSubscription } from "@/server/billing";
import { PAYMENT_KINDS, type PaymentKind, stripe, stripeEnabled } from "@/server/payments";
import { fulfillPayment } from "@/server/rentals";

export const runtime = "nodejs";

/**
 * Stripe webhook. Cross-origin by design, so no CSRF check — authenticity comes from the
 * signature over the raw body. Configure the endpoint for checkout.session.completed,
 * checkout.session.async_payment_succeeded, customer.subscription.updated and
 * customer.subscription.deleted.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeEnabled() || !secret) return Response.json({ error: "Payments are not configured" }, { status: 501 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return badRequest("Missing signature");
  const payload = await request.text();
  if (payload.length > 512_000) return badRequest("Payload too large");

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return badRequest("Invalid signature");
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const kind = session.metadata?.kind as PaymentKind | undefined;
    const referenceId = session.metadata?.referenceId;
    if (session.payment_status === "paid" && kind && PAYMENT_KINDS.includes(kind) && referenceId) {
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);
      await fulfillPayment(kind, referenceId, { method: "card", sessionId: session.id, subscriptionId });
    }
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await syncSubscription({
      id: sub.id,
      status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
      metadata: sub.metadata,
      current_period_end: (sub as unknown as { current_period_end?: number }).current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null,
    });
  }
  return Response.json({ received: true });
}
