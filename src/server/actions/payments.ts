"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth-helpers";
import { PAYMENT_KINDS, type PaymentKind, stripeEnabled } from "@/server/payments";
import { fulfillPayment, paymentOwner } from "@/server/rentals";

const ID_RE = /^[a-z0-9]{10,40}$/i;

/**
 * Completes a simulated payment. Only available when Stripe is not configured, and only for
 * the signed-in owner of the payment — no card data is collected and no money moves.
 */
export async function completeDemoPayment(formData: FormData) {
  const kind = String(formData.get("kind") ?? "") as PaymentKind;
  const id = String(formData.get("id") ?? "");
  if (stripeEnabled() || !PAYMENT_KINDS.includes(kind) || !ID_RE.test(id)) redirect("/account/rentals");
  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/pay/demo/${kind}/${id}`)}`);
  if ((await paymentOwner(kind, id)) !== user.id) redirect("/account/rentals");
  await fulfillPayment(kind, id, { method: "demo" });
  redirect(kind === "rent" ? "/account/rentals?paid=1" : "/account/rentals?submitted=1");
}
