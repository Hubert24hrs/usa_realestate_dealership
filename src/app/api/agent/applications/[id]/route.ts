import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { ID_RE, notFound, PRO_ROLES, withRole } from "@/server/api";
import { decideApplication } from "@/server/rentals";
import { applicationScope, getProScope } from "@/server/pro";

export const runtime = "nodejs";

const Body = z.object({
  decision: z.enum(["UNDER_REVIEW", "APPROVED", "DENIED"]),
  note: z.string().trim().max(1_000).optional(),
});

/** Property managers / listing agents review rental applications for homes they manage. */
export const POST = withRole<{ id: string }>(
  PRO_ROLES,
  async ({ request, user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, Body, 2_000);
    if (!body.ok) return body.response;
    const scope = await getProScope(user);
    const app = await db.rentalApplication.findFirst({ where: { id: params.id, ...applicationScope(scope) }, select: { id: true, status: true } });
    if (!app) return notFound();
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(app.status)) return Response.json({ error: "This application has already been decided." }, { status: 409 });
    if (body.data.decision === "UNDER_REVIEW") {
      await db.rentalApplication.update({ where: { id: app.id }, data: { status: "UNDER_REVIEW" } });
      return Response.json({ ok: true });
    }
    const result = await decideApplication(app.id, body.data.decision, body.data.note || undefined);
    return Response.json({ ok: true, leaseId: result?.leaseId ?? null });
  },
  { limit: 60, bucket: "agent-applications" },
);
