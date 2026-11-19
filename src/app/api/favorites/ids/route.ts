import { db } from "@/lib/db";
import { getSessionUser } from "@/server/auth-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ ids: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const favs = await db.favorite.findMany({ where: { userId: user.id }, select: { listingId: true } });
  return Response.json({ ids: favs.map((f) => f.listingId) }, { headers: { "Cache-Control": "private, no-store" } });
}
