import { db } from "@/lib/db";
import { withUser } from "@/server/api";

export const runtime = "nodejs";

/** Clears the signed-in user's recently viewed history. */
export const DELETE = withUser(async ({ user }) => {
  const result = await db.listingView.deleteMany({ where: { userId: user.id } });
  return Response.json({ ok: true, removed: result.count });
});
