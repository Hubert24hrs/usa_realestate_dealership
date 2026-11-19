import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

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
