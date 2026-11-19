import { db } from "@/lib/db";
import { getSessionUser } from "@/server/auth-helpers";
import { unreadConversationCount } from "@/server/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight session probe for client UI (keeps pages statically cacheable). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ user: null, unread: 0, unreadMessages: 0 }, { headers: { "Cache-Control": "private, no-store" } });
  const [unread, unreadMessages, agent, profile] = await Promise.all([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    unreadConversationCount(user.id),
    user.role === "AGENT" ? db.agent.findUnique({ where: { userId: user.id }, select: { slug: true } }) : Promise.resolve(null),
    // Read the name fresh so profile edits show immediately (the JWT copy refreshes every few minutes).
    db.user.findUnique({ where: { id: user.id }, select: { name: true } }),
  ]);
  return Response.json({ user: { ...user, name: profile?.name ?? user.name, agentSlug: agent?.slug ?? null }, unread, unreadMessages }, { headers: { "Cache-Control": "private, no-store" } });
}
