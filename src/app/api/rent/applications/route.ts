import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";

export const runtime = "nodejs";

const CreateSchema = z.object({
  listingId: z.string().regex(ID_RE),
  unitId: z.string().regex(ID_RE).nullable().optional(),
});

/** Start (or resume) a draft application for a rental. */
export const POST = withUser(
  async ({ request, user }) => {
    const body = await readJson(request, CreateSchema, 2_000);
    if (!body.ok) return body.response;
    const listing = await db.listing.findUnique({
      where: { id: body.data.listingId },
      select: { id: true, category: true, status: true, applicationFee: true, units: { where: { isAvailable: true }, select: { id: true } } },
    });
    if (!listing || listing.category !== "RENTAL") return notFound();
    if (!["ACTIVE", "COMING_SOON"].includes(listing.status)) return badRequest("This rental isn't accepting applications right now.");

    const existing = await db.rentalApplication.findFirst({ where: { userId: user.id, listingId: listing.id, status: "DRAFT" }, orderBy: { updatedAt: "desc" }, select: { id: true } });
    if (existing) return Response.json({ id: existing.id });
    const drafts = await db.rentalApplication.count({ where: { userId: user.id, status: "DRAFT" } });
    if (drafts >= 10) return badRequest("Finish or withdraw one of your draft applications first.");

    const unitId = body.data.unitId && listing.units.some((u) => u.id === body.data.unitId) ? body.data.unitId : null;
    const app = await db.rentalApplication.create({ data: { listingId: listing.id, unitId, userId: user.id, applicant: {}, feeAmount: listing.applicationFee ?? 0 } });
    return Response.json({ id: app.id }, { status: 201 });
  },
  { limit: 20, bucket: "rent-apply" },
);
