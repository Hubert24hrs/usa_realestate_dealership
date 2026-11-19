import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { badRequest, readJson } from "@/lib/security/request";
import { ApplicationPatchSchema } from "@/lib/validation/rental";
import { ID_RE, notFound, withUser } from "@/server/api";

export const runtime = "nodejs";

/** Save one or more sections of a draft application. */
export const PATCH = withUser<{ id: string }>(
  async ({ request, user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, ApplicationPatchSchema, 16_000);
    if (!body.ok) return body.response;
    const app = await db.rentalApplication.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, status: true, listing: { select: { units: { where: { isAvailable: true }, select: { id: true } } } } },
    });
    if (!app || app.userId !== user.id) return notFound();
    if (app.status !== "DRAFT") return Response.json({ error: "Submitted applications can't be edited." }, { status: 409 });

    const d = body.data;
    const data: Prisma.RentalApplicationUncheckedUpdateInput = {};
    if (d.home) {
      if (d.home.unitId && !app.listing.units.some((u) => u.id === d.home!.unitId)) return badRequest("That unit is no longer available. Pick another.");
      const moveIn = new Date(`${d.home.moveInDate}T12:00:00Z`);
      if (Number.isNaN(+moveIn) || +moveIn < Date.now() - 2 * 86_400_000) return badRequest("Move in date can't be in the past.");
      if (+moveIn > Date.now() + 400 * 86_400_000) return badRequest("Move in date must be within the next year.");
      data.unitId = d.home.unitId ?? null;
      data.moveInDate = moveIn;
      data.leaseTermMonths = d.home.leaseTermMonths;
    }
    if (d.applicant) data.applicant = d.applicant as Prisma.InputJsonValue;
    if (d.employment) data.employment = d.employment as Prisma.InputJsonValue;
    if (d.household) {
      data.occupants = d.household.occupants;
      data.hasPets = d.household.hasPets;
      data.petDetails = d.household.hasPets ? d.household.petDetails || null : null;
      data.vehicles = d.household.vehicles;
    }
    if (d.references) data.references = d.references.references.filter((r) => r.name.trim()) as Prisma.InputJsonValue;
    await db.rentalApplication.update({ where: { id: app.id }, data });
    return Response.json({ ok: true, savedAt: new Date().toISOString() });
  },
  { limit: 120, bucket: "rent-apply-save" },
);
