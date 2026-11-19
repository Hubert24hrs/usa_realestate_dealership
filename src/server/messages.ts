import "server-only";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { emailLayout, sendEmail } from "./email";
import { pushToUser } from "./push";

/** Conversations the user participates in, newest activity first, with unread flags. */
export async function listConversations(userId: string) {
  const parts = await db.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          listing: { select: { slug: true, streetAddress: true, city: true, state: true, communityName: true, media: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, alt: true, blurDataUrl: true, color: true } } } },
          participants: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });
  return parts.map((p) => {
    const c = p.conversation;
    const last = c.messages[0];
    const others = c.participants.filter((x) => x.userId !== userId).map((x) => x.user);
    return {
      id: c.id,
      subject: c.subject,
      listing: c.listing,
      others,
      last: last ? { body: last.body, createdAt: last.createdAt.toISOString(), mine: last.senderId === userId } : null,
      unread: Boolean(last && last.senderId !== userId && (!p.lastReadAt || p.lastReadAt < last.createdAt)),
      updatedAt: c.updatedAt.toISOString(),
    };
  });
}

/** Send a message and notify the other participants (in-app, email per preference, push). */
export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const convo = await db.conversation.findUnique({ where: { id: conversationId }, include: { participants: { include: { user: { select: { id: true, email: true, name: true, notificationPrefs: true } } } } } });
  if (!convo || !convo.participants.some((p) => p.userId === senderId)) return null;
  const now = new Date();
  const message = await db.message.create({ data: { conversationId, senderId, body } });
  await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: now } });
  await db.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId: senderId } }, data: { lastReadAt: now } });
  const sender = convo.participants.find((p) => p.userId === senderId)?.user;
  for (const p of convo.participants.filter((x) => x.userId !== senderId)) {
    const title = `New message from ${sender?.name ?? "a CITI VIEW member"}`;
    await db.notification.create({ data: { userId: p.userId, type: "MESSAGE", title, body: body.slice(0, 140), url: `/account/messages?c=${conversationId}` } });
    if (p.user.email && (p.user.notificationPrefs?.emailMessages ?? true)) {
      await sendEmail({ to: p.user.email, subject: title, html: emailLayout({ title, body: body.slice(0, 1000), cta: { label: "Reply in CITI VIEW", url: `${site.url}/account/messages?c=${conversationId}` } }) });
    }
    await pushToUser(p.userId, { title, body: body.slice(0, 100), url: `/account/messages?c=${conversationId}` });
  }
  return message;
}

/** Find or create a 1:1 conversation between a user and an agent's user account (optionally about a listing). */
export async function findOrCreateConversation(userId: string, otherUserId: string, opts: { listingId?: string | null; subject?: string | null }) {
  const existing = await db.conversation.findFirst({
    where: {
      listingId: opts.listingId ?? null,
      AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: otherUserId } } }],
    },
  });
  if (existing) return existing;
  return db.conversation.create({
    data: { subject: opts.subject ?? null, listingId: opts.listingId ?? null, participants: { create: [{ userId }, { userId: otherUserId }] } },
  });
}

/** Conversations with messages from someone else that the user hasn't opened since they arrived. */
export async function unreadConversationCount(userId: string): Promise<number> {
  const rows = await db.$queryRaw<Array<{ n: number }>>`
    SELECT COUNT(DISTINCT m."conversationId")::int AS n
    FROM "Message" m
    JOIN "ConversationParticipant" p ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
    WHERE m."senderId" <> ${userId} AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")`;
  return rows[0]?.n ?? 0;
}
