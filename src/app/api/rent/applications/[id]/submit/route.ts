import { db } from "@/lib/db";
import { badRequest, readJson } from "@/lib/security/request";
import { SubmitSchema } from "@/lib/validation/rental";
import { ID_RE, notFound, withUser } from "@/server/api";
import { createCheckout } from "@/server/payments";
import { markSubmitted, missingSections } from "@/server/rentals";

export const runtime = "nodejs";

/** Record consent, then collect the application fee (if any) or submit directly. */
export const POST = withUser<{ id: string }>(
  async ({ request, user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, SubmitSchema, 2_000);
    if (!body.ok) return body.response;
    const app = await db.rentalApplication.findUnique({
      where: { id: params.id },
      include: { listing: { select: { slug: true, communityName: true, streetAddress: true, city: true, state: true } } },
    });
    if (!app || app.userId !== user.id) return notFound();
    if (app.status !== "DRAFT") return Response.json({ error: "This application was already submitted." }, { status: 409 });
    const missing = missingSections(app);
    if (missing.length) return badRequest(`Please finish: ${missing.join(", ")}.`);

    await db.rentalApplication.update({ where: { id: app.id }, data: { consentScreening: true, consentAt: new Date() } });
    const fee = app.feeAmount ?? 0;
    if (fee > 0 && !app.feePaid) {
      const place = `${app.listing.communityName ?? app.listing.streetAddress}, ${app.listing.city}, ${app.listing.state}`;
      const checkout = await createCheckout({
        kind: "application_fee",
        referenceId: app.id,
        amountCents: fee * 100,
        description: `Rental application fee for ${place}`,
        customerEmail: user.email,
        successPath: "/account/rentals?submitted=1",
        cancelPath: `/rent/apply/${app.listing.slug}?app=${app.id}&canceled=1`,
      });
      if (checkout.sessionId) await db.rentalApplication.update({ where: { id: app.id }, data: { feeSessionId: checkout.sessionId } });
      return Response.json({ redirect: checkout.url });
    }
    await markSubmitted(app.id);
    return Response.json({ redirect: "/account/rentals?submitted=1" });
  },
  { limit: 10, bucket: "rent-apply-submit" },
);
