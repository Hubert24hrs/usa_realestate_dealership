import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";
import { createCheckout } from "@/server/payments";
import { addMonths, nextRentDue, periodLabel } from "@/server/rentals";

export const runtime = "nodejs";

const PaySchema = z.object({ leaseId: z.string().regex(ID_RE) });

/** Start a rent payment for the next unpaid month of an active lease. */
export const POST = withUser(
  async ({ request, user }) => {
    const body = await readJson(request, PaySchema, 1_000);
    if (!body.ok) return body.response;
    const lease = await db.lease.findUnique({
      where: { id: body.data.leaseId },
      include: { payments: { select: { id: true, periodStart: true, status: true } }, listing: { select: { communityName: true, streetAddress: true, city: true, state: true } } },
    });
    if (!lease || lease.tenantId !== user.id) return notFound();
    const due = nextRentDue(lease, lease.payments);
    if (!due) return Response.json({ error: lease.status === "ACTIVE" ? "You're all paid up." : "Sign your lease before paying rent." }, { status: 409 });

    // Reuse a pending attempt for the same month so retries don't create duplicates.
    const pending = await db.rentPayment.findFirst({
      where: { leaseId: lease.id, status: { in: ["PENDING", "FAILED"] }, periodStart: { gte: new Date(+due.periodStart - 2 * 86_400_000), lt: addMonths(due.periodStart, 1) } },
      select: { id: true },
    });
    const payment = pending
      ? await db.rentPayment.update({ where: { id: pending.id }, data: { status: "PENDING", amountCents: due.amountCents } })
      : await db.rentPayment.create({ data: { leaseId: lease.id, userId: user.id, amountCents: due.amountCents, periodStart: due.periodStart, status: "PENDING" } });

    const place = `${lease.listing.communityName ?? lease.listing.streetAddress}, ${lease.listing.city}, ${lease.listing.state}`;
    const checkout = await createCheckout({
      kind: "rent",
      referenceId: payment.id,
      amountCents: due.amountCents,
      description: `Rent for ${periodLabel(due.periodStart)}, ${place}`,
      customerEmail: user.email,
      successPath: "/account/rentals?paid=1",
      cancelPath: "/account/rentals?canceled=1",
    });
    if (checkout.sessionId) await db.rentPayment.update({ where: { id: payment.id }, data: { stripeSessionId: checkout.sessionId } });
    return Response.json({ redirect: checkout.url });
  },
  { limit: 10, bucket: "rent-pay" },
);
