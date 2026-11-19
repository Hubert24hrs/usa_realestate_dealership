import { db } from "@/lib/db";
import { limitRequest } from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/security/request";
import { getSessionUser } from "@/server/auth-helpers";

export const runtime = "nodejs";

/** Records a listing view (analytics + view count + signed-in recently viewed). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return new Response(null, { status: 204 });
  const limit = await limitRequest(request, "view", 120, 60_000);
  if (!limit.ok) return new Response(null, { status: 204 });
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response(null, { status: 204 });
  const listing = await db.listing.findUnique({ where: { id }, select: { id: true, agentId: true } });
  if (!listing) return new Response(null, { status: 204 });
  const user = await getSessionUser();
  await Promise.all([
    db.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } }),
    db.analyticsEvent.create({ data: { type: "listing_view", listingId: id, agentId: listing.agentId, userId: user?.id ?? null, path: "/property" } }),
    user ? db.listingView.upsert({ where: { userId_listingId: { userId: user.id, listingId: id } }, create: { userId: user.id, listingId: id }, update: { viewedAt: new Date() } }) : Promise.resolve(null),
  ]);
  return new Response(null, { status: 204 });
}
