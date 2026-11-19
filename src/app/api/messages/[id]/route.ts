import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";
import { sendMessage } from "@/server/messages";

export const runtime = "nodejs";

export const GET = withUser<{ id: string }>(async ({ user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const part = await db.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId: params.id, userId: user.id } } });
  if (!part) return notFound();
  const messages = await db.message.findMany({ where: { conversationId: params.id }, orderBy: { createdAt: "asc" }, take: 200, include: { sender: { select: { id: true, name: true } } } });
  await db.conversationParticipant.update({ where: { conversationId_userId: { conversationId: params.id, userId: user.id } }, data: { lastReadAt: new Date() } });
  return Response.json({
    messages: messages.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), mine: m.senderId === user.id, sender: m.sender.name })),
  });
});

const Body = z.object({ body: z.string().trim().min(1).max(4000) });

export const POST = withUser<{ id: string }>(async ({ request, user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const parsed = await readJson(request, Body, 10_000);
  if (!parsed.ok) return parsed.response;
  const message = await sendMessage(params.id, user.id, parsed.data.body);
  if (!message) return notFound();
  return Response.json({ ok: true, id: message.id });
}, { limit: 40, bucket: "messages" });
