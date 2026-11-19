import { db } from "@/lib/db";
import { ID_RE, notFound, withUser } from "@/server/api";

export const runtime = "nodejs";

/** The owner removes a co-shopper (or revokes an invite); a member can remove themself (leave). */
export const DELETE = withUser<{ id: string; memberId: string }>(async ({ user, params }) => {
  if (!ID_RE.test(params.id) || !ID_RE.test(params.memberId)) return notFound();
  const member = await db.collectionMember.findUnique({
    where: { id: params.memberId },
    select: { id: true, collectionId: true, userId: true, collection: { select: { ownerId: true } } },
  });
  if (!member || member.collectionId !== params.id) return notFound();
  const isOwner = member.collection.ownerId === user.id;
  if (!isOwner && member.userId !== user.id) return notFound();
  await db.collectionMember.delete({ where: { id: member.id } });
  return Response.json({ ok: true, left: !isOwner });
});
