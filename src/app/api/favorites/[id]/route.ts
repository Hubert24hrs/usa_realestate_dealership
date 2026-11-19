import { db } from "@/lib/db";
import { ID_RE, notFound, withUser } from "@/server/api";

export const runtime = "nodejs";

export const POST = withUser<{ id: string }>(async ({ user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const listing = await db.listing.findUnique({ where: { id: params.id }, select: { id: true, agentId: true } });
  if (!listing) return notFound();
  const existing = await db.favorite.findUnique({ where: { userId_listingId: { userId: user.id, listingId: listing.id } } });
  if (!existing) {
    await db.$transaction([
      db.favorite.create({ data: { userId: user.id, listingId: listing.id } }),
      db.listing.update({ where: { id: listing.id }, data: { saveCount: { increment: 1 } } }),
      db.analyticsEvent.create({ data: { type: "listing_save", listingId: listing.id, agentId: listing.agentId, userId: user.id } }),
    ]);
  }
  return Response.json({ ok: true, saved: true });
});

export const DELETE = withUser<{ id: string }>(async ({ user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const result = await db.favorite.deleteMany({ where: { userId: user.id, listingId: params.id } });
  if (result.count) await db.listing.update({ where: { id: params.id }, data: { saveCount: { decrement: 1 } } }).catch(() => undefined);
  return Response.json({ ok: true, saved: false });
});
