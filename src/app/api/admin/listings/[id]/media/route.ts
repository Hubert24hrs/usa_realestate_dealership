import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, readJson } from "@/lib/security/request";
import { PHOTO_CATEGORIES } from "@/lib/validation/fsbo";
import { revalidateListings } from "@/server/admin";
import { ID_RE, notFound, withRole } from "@/server/api";

export const runtime = "nodejs";

const CATS = PHOTO_CATEGORIES.map(([c]) => c) as [string, ...string[]];
const Body = z.object({
  photos: z.array(z.object({ uploadId: z.string().regex(ID_RE), category: z.enum(CATS), alt: z.string().trim().min(3).max(160) })).min(1).max(30),
});

/** Attach the admin's freshly uploaded photos to a listing (appended after existing media). */
export const POST = withRole<{ id: string }>(
  ["ADMIN"],
  async ({ request, user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, Body, 16_000);
    if (!body.ok) return body.response;
    const listing = await db.listing.findUnique({ where: { id: params.id }, select: { id: true, slug: true, media: { orderBy: { sortOrder: "desc" }, take: 1, select: { sortOrder: true } }, _count: { select: { media: true } } } });
    if (!listing) return notFound();
    const ids = [...new Set(body.data.photos.map((p) => p.uploadId))];
    const uploads = await db.upload.findMany({ where: { id: { in: ids }, userId: user.id }, select: { id: true, url: true, width: true, height: true } });
    if (uploads.length !== ids.length) return badRequest("Some uploads are missing — upload them again.");
    if (await db.listingMedia.count({ where: { provider: "UPLOAD", providerId: { in: ids.map((id) => `upload:${id}`) } } })) return badRequest("Some photos are already attached to a listing.");
    const byId = new Map(uploads.map((u) => [u.id, u]));
    let order = (listing.media[0]?.sortOrder ?? -1) + 1;
    await db.listingMedia.createMany({
      data: body.data.photos.map((p, i) => {
        const u = byId.get(p.uploadId)!;
        return {
          listingId: listing.id,
          type: p.category === "FLOOR_PLAN" ? ("FLOOR_PLAN" as const) : ("PHOTO" as const),
          category: p.category as never,
          url: u.url,
          width: u.width,
          height: u.height,
          alt: p.alt,
          sortOrder: order++,
          isPrimary: listing._count.media === 0 && i === 0,
          provider: "UPLOAD" as const,
          providerId: `upload:${u.id}`,
          license: "Uploaded by CITI VIEW staff",
        };
      }),
    });
    revalidateListings(listing.slug);
    return Response.json({ ok: true, added: body.data.photos.length });
  },
  { limit: 30, bucket: "admin" },
);
