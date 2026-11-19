import { z } from "zod";
import { db } from "@/lib/db";
import { forbidden, readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";
import { canEdit, collectionAudience, getCollectionAccess } from "@/server/collections";

export const runtime = "nodejs";

type Params = { id: string; listingId: string };

const Patch = z.object({ sharedNote: z.string().trim().max(2000) });

/** Update the shared note everyone in the collection sees. */
export const PATCH = withUser<Params>(async ({ request, user, params }) => {
  if (!ID_RE.test(params.id) || !ID_RE.test(params.listingId)) return notFound();
  const found = await getCollectionAccess(params.id, user.id);
  if (!found) return notFound();
  if (!canEdit(found.access)) return forbidden("You have view only access to this collection");
  const parsed = await readJson(request, Patch, 4_000);
  if (!parsed.ok) return parsed.response;
  const note = parsed.data.sharedNote || null;
  const result = await db.collectionItem.updateMany({ where: { collectionId: params.id, listingId: params.listingId }, data: { sharedNote: note } });
  if (!result.count) return notFound();
  if (note) {
    const audience = await collectionAudience(params.id, user.id);
    if (audience.length) {
      await db.notification.createMany({
        data: audience.map((userId) => ({
          userId,
          type: "COLLECTION" as const,
          title: `${user.name ?? "A shopping partner"} left a note in “${found.collection.name}”`,
          body: note.slice(0, 140),
          url: `/account/collections/${params.id}`,
        })),
      });
    }
  }
  return Response.json({ ok: true });
});

export const DELETE = withUser<Params>(async ({ user, params }) => {
  if (!ID_RE.test(params.id) || !ID_RE.test(params.listingId)) return notFound();
  const found = await getCollectionAccess(params.id, user.id);
  if (!found) return notFound();
  if (!canEdit(found.access)) return forbidden("You have view only access to this collection");
  const result = await db.collectionItem.deleteMany({ where: { collectionId: params.id, listingId: params.listingId } });
  return result.count ? Response.json({ ok: true }) : notFound();
});
