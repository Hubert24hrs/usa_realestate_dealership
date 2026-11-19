import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { withUser } from "@/server/api";
import { createLead } from "@/server/leads";
import { findOrCreateConversation, listConversations, sendMessage } from "@/server/messages";

export const runtime = "nodejs";

export const GET = withUser(async ({ user }) => Response.json({ conversations: await listConversations(user.id) }));

const Start = z.object({
  agentSlug: z.string().regex(/^[a-z0-9-]{3,120}$/).optional(),
  listingId: z.string().regex(/^[a-z0-9]{10,40}$/i).optional(),
  body: z.string().trim().min(1).max(4000),
});

/** Start (or continue) a conversation with an agent or a listing's agent/owner. */
export const POST = withUser(async ({ request, user }) => {
  const parsed = await readJson(request, Start, 10_000);
  if (!parsed.ok) return parsed.response;
  const { agentSlug, listingId, body } = parsed.data;
  let otherUserId: string | null = null;
  let agentId: string | null = null;
  let subject: string | null = null;
  if (listingId) {
    const listing = await db.listing.findUnique({ where: { id: listingId }, select: { streetAddress: true, communityName: true, ownerId: true, agent: { select: { id: true, userId: true } } } });
    if (!listing) return Response.json({ error: "Listing not found" }, { status: 404 });
    otherUserId = listing.agent?.userId ?? listing.ownerId ?? null;
    agentId = listing.agent?.id ?? null;
    subject = listing.communityName ?? listing.streetAddress;
  } else if (agentSlug) {
    const agent = await db.agent.findUnique({ where: { slug: agentSlug }, select: { id: true, userId: true, name: true } });
    if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });
    otherUserId = agent.userId;
    agentId = agent.id;
    subject = `Question for ${agent.name}`;
  }
  // Demo agents without a CITI VIEW login get the message as a lead instead of a chat.
  if (!otherUserId || otherUserId === user.id) {
    await createLead({ type: "CONTACT_AGENT", listingId: listingId ?? null, agentId, userId: user.id, name: user.name ?? "CITI VIEW member", email: user.email ?? "unknown@citiview.example", message: body, source: "messages" });
    return Response.json({ ok: true, deliveredAs: "lead" });
  }
  const convo = await findOrCreateConversation(user.id, otherUserId, { listingId: listingId ?? null, subject });
  await sendMessage(convo.id, user.id, body);
  return Response.json({ ok: true, conversationId: convo.id, deliveredAs: "message" });
}, { limit: 20, bucket: "messages" });
