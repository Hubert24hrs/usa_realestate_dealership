import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { emailLayout, sendEmail } from "./email";

export type CollectionAccess = "OWNER" | "EDITOR" | "VIEWER";

export const INVITE_TOKEN_RE = /^[A-Za-z0-9_-]{16,80}$/;

/** The caller's access to a collection: owner, or an accepted member (editor / viewer). */
export async function getCollectionAccess(collectionId: string, userId: string) {
  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    select: { id: true, name: true, ownerId: true, members: { where: { userId, acceptedAt: { not: null } }, select: { role: true } } },
  });
  if (!collection) return null;
  const member = collection.members[0];
  const access: CollectionAccess | null = collection.ownerId === userId ? "OWNER" : member ? (member.role === "VIEWER" ? "VIEWER" : "EDITOR") : null;
  return access ? { access, collection: { id: collection.id, name: collection.name, ownerId: collection.ownerId } } : null;
}

export const canEdit = (access: CollectionAccess) => access !== "VIEWER";

export const newInviteToken = () => randomBytes(24).toString("base64url");

export class InviteError extends Error {}

/**
 * Invite (or re-invite) someone to a collection by email and notify them. The caller must
 * already have checked that `inviter` owns the collection.
 */
export async function inviteMember(opts: {
  collection: { id: string; name: string };
  inviter: { name: string | null; email: string | null };
  email: string;
  role: "EDITOR" | "VIEWER";
  isAgent?: boolean;
}) {
  const email = opts.email.trim().toLowerCase();
  if (email === opts.inviter.email?.toLowerCase()) throw new InviteError("That's your own email — you already own this collection.");
  const existing = await db.collectionMember.findUnique({ where: { collectionId_email: { collectionId: opts.collection.id, email } } });
  if (!existing && (await db.collectionMember.count({ where: { collectionId: opts.collection.id } })) >= 10) throw new InviteError("A collection can have up to 10 co-shoppers.");
  const member = existing
    ? await db.collectionMember.update({ where: { id: existing.id }, data: { role: opts.role, isAgent: opts.isAgent ?? existing.isAgent } })
    : await db.collectionMember.create({ data: { collectionId: opts.collection.id, email, role: opts.role, isAgent: opts.isAgent ?? false, inviteToken: newInviteToken() } });

  if (!member.acceptedAt) {
    const inviter = opts.inviter.name ?? "A CITI VIEW member";
    const url = `${site.url}/collections/join/${member.inviteToken}`;
    await sendEmail({
      to: email,
      subject: `${inviter} invited you to “${opts.collection.name}” on CITI VIEW`,
      html: emailLayout({
        title: opts.isAgent ? "A client wants to shop with you" : "Shop for homes together",
        intro: `${inviter} invited you to the collection “${opts.collection.name}”. Save homes side by side, leave shared notes and plan tours together.`,
        rows: [["Your access", opts.role === "VIEWER" ? "Can view" : "Can add homes and notes"]],
        cta: { label: "Open the collection", url },
        footnote: "Not expecting this? You can ignore this email — nothing happens unless you accept.",
      }),
      text: `${inviter} invited you to "${opts.collection.name}" on CITI VIEW: ${url}`,
    });
    const invitee = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (invitee) {
      await db.notification.create({ data: { userId: invitee.id, type: "COLLECTION", title: `${inviter} invited you to “${opts.collection.name}”`, url: `/collections/join/${member.inviteToken}` } });
    }
  }
  return { member, resent: Boolean(existing) };
}

/** Owner plus accepted members, minus the actor — who hears about activity in a shared collection. */
export async function collectionAudience(collectionId: string, exceptUserId: string): Promise<string[]> {
  const c = await db.collection.findUnique({
    where: { id: collectionId },
    select: { ownerId: true, members: { where: { acceptedAt: { not: null }, userId: { not: null } }, select: { userId: true } } },
  });
  if (!c) return [];
  return [...new Set([c.ownerId, ...c.members.flatMap((m) => (m.userId ? [m.userId] : []))])].filter((id) => id !== exceptUserId);
}

/** Collections the user owns or has joined, newest activity first. Optionally flags which contain a listing. */
export async function listCollections(userId: string, listingId?: string) {
  const rows = await db.collection.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId, acceptedAt: { not: null } } } }] },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      description: true,
      ownerId: true,
      updatedAt: true,
      owner: { select: { name: true } },
      members: { where: { userId }, select: { role: true } },
      _count: { select: { items: true, members: true } },
      items: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { listing: { select: { media: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true, blurDataUrl: true, color: true } } } } },
      },
    },
  });
  const containing = listingId
    ? new Set((await db.collectionItem.findMany({ where: { listingId, collectionId: { in: rows.map((r) => r.id) } }, select: { collectionId: true } })).map((i) => i.collectionId))
    : null;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    access: (r.ownerId === userId ? "OWNER" : r.members[0]?.role === "VIEWER" ? "VIEWER" : "EDITOR") as CollectionAccess,
    ownerName: r.owner.name,
    itemCount: r._count.items,
    memberCount: r._count.members,
    covers: r.items.flatMap((i) => i.listing.media.slice(0, 1)),
    updatedAt: r.updatedAt.toISOString(),
    containsListing: containing ? containing.has(r.id) : undefined,
  }));
}

export type CollectionSummary = Awaited<ReturnType<typeof listCollections>>[number];
