import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { ID_RE, notFound, withUser } from "@/server/api";
import { decideApplication } from "@/server/rentals";

export const runtime = "nodejs";

/**
 * Demo mode only: lets an applicant simulate the property manager's approval so the
 * lease → e-sign → rent payment flow can be tried end to end. Real decisions come from the manager.
 */
export const POST = withUser<{ id: string }>(
  async ({ user, params }) => {
    if (!site.demoMode) return notFound();
    if (!ID_RE.test(params.id)) return notFound();
    const app = await db.rentalApplication.findUnique({ where: { id: params.id }, select: { id: true, userId: true, status: true } });
    if (!app || app.userId !== user.id) return notFound();
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(app.status)) return Response.json({ error: "Only submitted applications can be approved." }, { status: 409 });
    const result = await decideApplication(app.id, "APPROVED", "Approved (simulated approval).");
    return Response.json({ ok: true, leaseId: result?.leaseId ?? null });
  },
  { limit: 10, bucket: "rent-simulate-approval" },
);
