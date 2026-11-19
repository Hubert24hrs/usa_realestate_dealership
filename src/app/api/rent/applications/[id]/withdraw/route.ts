import { db } from "@/lib/db";
import { ID_RE, notFound, withUser } from "@/server/api";

export const runtime = "nodejs";

export const POST = withUser<{ id: string }>(
  async ({ user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const app = await db.rentalApplication.findUnique({ where: { id: params.id }, select: { id: true, userId: true, status: true } });
    if (!app || app.userId !== user.id) return notFound();
    if (!["DRAFT", "SUBMITTED", "UNDER_REVIEW"].includes(app.status)) return Response.json({ error: "This application can no longer be withdrawn." }, { status: 409 });
    await db.rentalApplication.update({ where: { id: app.id }, data: { status: "WITHDRAWN", decidedAt: new Date() } });
    return Response.json({ ok: true });
  },
  { limit: 20, bucket: "rent-apply-withdraw" },
);
