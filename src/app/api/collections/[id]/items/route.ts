import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";
import { canEdit, collectionAudience, getCollectionAccess } from "@/server/collections";

export const runtime = "nodejs";

const Add = z.object({
  listingId: z.string().regex(ID_RE),
  sharedNote: z.string().trim().max(2000).optional(),
});

/** Add a home to a collection (owner or editor) and let co-shoppers know. */
export const POST = withUser<{ id: string }>(
  async ({ request, user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const found = await getCollectionAccess(params.id, user.id);
    if (!found) return notFound();
    if (!canEdit(found.access)) return forbidden("You have view only access to this collection");
    const parsed = await readJson(request, Add, 4_000);
    if (!parsed.ok) return parsed.response;
    const { listingId, sharedNote } = parsed.data;
    const listing = await db.listing.findUnique({ where: { id: listingId }, select: { id: true, streetAddress: true, communityName: true } });
    if (!listing) return badRequest("Listing not found");
    const existing = await db.collectionItem.findUnique({ where: { collectionId_listingId: { collectionId: params.id, listingId } }, select: { id: true } });
    if (!existing && (await db.collectionItem.count({ where: { collectionId: params.id } })) >= 200) return badRequest("Collections hold up to 200 homes.");
    await db.collectionItem.upsert({
      where: { collectionId_listingId: { collectionId: params.id, listingId } },
      create: { collectionId: params.id, listingId, addedById: user.id, sharedNote: sharedNote || null },
      update: sharedNote ? { sharedNote } : {},
    });
    await db.collection.update({ where: { id: params.id }, data: { updatedAt: new Date() } });
    if (!existing) {
      const audience = await collectionAudience(params.id, user.id);
      if (audience.length) {
        await db.notification.createMany({
          data: audience.map((userId) => ({
            userId,
            type: "COLLECTION" as const,
            title: `${user.name ?? "A shopping partner"} added a home to “${found.collection.name}”`,
            body: listing.communityName ?? listing.streetAddress,
            url: `/account/collections/${params.id}`,
          })),
        });
      }
    }
    return Response.json({ ok: true, added: !existing });
  },
  { limit: 60, bucket: "collections" },
);
