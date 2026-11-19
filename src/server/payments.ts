import "server-only";
import Stripe from "stripe";
import { site } from "@/lib/site";

/**
 * Payments: Stripe Checkout when STRIPE_SECRET_KEY is set (use test-mode keys in development),
 * otherwise a clearly labelled simulated checkout so the demo works end to end with no money moving.
 */
export type PaymentKind = "rent" | "application_fee" | "agent_plan";
export const PAYMENT_KINDS: readonly PaymentKind[] = ["rent", "application_fee", "agent_plan"];

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: "CITI VIEW Real Estate" }, maxNetworkRetries: 2 });
  return client;
}

export interface CheckoutRequest {
  kind: PaymentKind;
  referenceId: string;
  amountCents: number;
  description: string;
  customerEmail?: string | null;
  /** Same-site paths to return to. */
  successPath: string;
  cancelPath: string;
}

export async function createCheckout(req: CheckoutRequest): Promise<{ url: string; sessionId: string | null; simulated: boolean }> {
  if (!stripeEnabled()) return { url: `/pay/checkout/${req.kind}/${req.referenceId}`, sessionId: null, simulated: true };
  const sep = req.successPath.includes("?") ? "&" : "?";
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: req.customerEmail ?? undefined,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: req.amountCents, product_data: { name: req.description } } }],
    metadata: { kind: req.kind, referenceId: req.referenceId },
    payment_intent_data: { metadata: { kind: req.kind, referenceId: req.referenceId }, description: req.description },
    success_url: `${site.url}${req.successPath}${sep}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site.url}${req.cancelPath}`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, sessionId: session.id, simulated: false };
}

/** Look up a completed Checkout session (used on the success redirect so fulfilment never waits on webhooks). */
export async function paidSession(sessionId: string): Promise<{ kind: PaymentKind; referenceId: string; sessionId: string; subscriptionId: string | null } | null> {
  if (!stripeEnabled() || !/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) return null;
  const s = await stripe().checkout.sessions.retrieve(sessionId);
  const kind = s.metadata?.kind as PaymentKind | undefined;
  const referenceId = s.metadata?.referenceId;
  if (s.payment_status !== "paid" || !kind || !PAYMENT_KINDS.includes(kind) || !referenceId) return null;
  const subscriptionId = typeof s.subscription === "string" ? s.subscription : (s.subscription?.id ?? null);
  return { kind, referenceId, sessionId: s.id, subscriptionId };
}
