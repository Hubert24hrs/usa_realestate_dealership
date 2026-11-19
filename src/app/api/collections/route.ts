import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, readJson } from "@/lib/security/request";
import { ID_RE, withUser } from "@/server/api";
import { listCollections } from "@/server/collections";

export const runtime = "nodejs";

export const GET = withUser(async ({ request, user }) => {
  const listingId = new URL(request.url).searchParams.get("listingId");
  return Response.json({ collections: await listCollections(user.id, listingId && ID_RE.test(listingId) ? listingId : undefined) });
});

const Create = z.object({
  name: z.string().trim().min(1, "Give the collection a name").max(80),
  description: z.string().trim().max(300).optional(),
  listingId: z.string().regex(ID_RE).optional(),
});

/** Create a collection, optionally seeding it with the listing the user is looking at. */
export const POST = withUser(
  async ({ request, user }) => {
    const parsed = await readJson(request, Create, 4_000);
    if (!parsed.ok) return parsed.response;
    const { name, description, listingId } = parsed.data;
    if ((await db.collection.count({ where: { ownerId: user.id } })) >= 50) return badRequest("You can have up to 50 collections.");
    if (listingId && !(await db.listing.findUnique({ where: { id: listingId }, select: { id: true } }))) return badRequest("Listing not found");
    const collection = await db.collection.create({
      data: { ownerId: user.id, name, description: description || null, ...(listingId ? { items: { create: { listingId, addedById: user.id } } } : {}) },
      select: { id: true },
    });
    return Response.json({ ok: true, id: collection.id });
  },
  { limit: 20, bucket: "collections" },
);
