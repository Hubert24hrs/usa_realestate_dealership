import { z } from "zod";
import { db } from "@/lib/db";
import { MEDIA_CATEGORIES } from "@/lib/domain";
import { readJson } from "@/lib/security/request";
import { revalidateListings } from "@/server/admin";
import { ID_RE, notFound, withRole } from "@/server/api";

export const runtime = "nodejs";

const Body = z
  .object({
    category: z.enum(MEDIA_CATEGORIES).optional(),
    alt: z.string().trim().min(3).max(160).optional(),
    move: z.enum(["up", "down"]).optional(),
    cover: z.literal(true).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");

async function siblings(listingId: string) {
  return db.listingMedia.findMany({ where: { listingId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, sortOrder: true } });
}

/** Media manager: relabel, re-describe, reorder or make the cover photo. */
export const PATCH = withRole<{ id: string }>(
  ["ADMIN"],
  async ({ request, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, Body, 2_000);
    if (!body.ok) return body.response;
    const media = await db.listingMedia.findUnique({ where: { id: params.id }, select: { id: true, listingId: true, listing: { select: { slug: true } } } });
    if (!media) return notFound();
    const { category, alt, move, cover } = body.data;
    if (category || alt) await db.listingMedia.update({ where: { id: media.id }, data: { ...(category ? { category } : {}), ...(alt ? { alt } : {}) } });
    if (move || cover) {
      const list = await siblings(media.listingId);
      const ids = list.map((m) => m.id);
      const i = ids.indexOf(media.id);
      if (cover) ids.unshift(...ids.splice(i, 1));
      else if (move === "up" && i > 0) [ids[i - 1], ids[i]] = [ids[i]!, ids[i - 1]!];
      else if (move === "down" && i < ids.length - 1) [ids[i + 1], ids[i]] = [ids[i]!, ids[i + 1]!];
      await db.$transaction(ids.map((id, order) => db.listingMedia.update({ where: { id }, data: { sortOrder: order, isPrimary: order === 0 } })));
    }
    revalidateListings(media.listing.slug);
    return Response.json({ ok: true });
  },
  { limit: 240, bucket: "admin" },
);

export const DELETE = withRole<{ id: string }>(
  ["ADMIN"],
  async ({ params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const media = await db.listingMedia.findUnique({ where: { id: params.id }, select: { id: true, listingId: true, listing: { select: { slug: true } } } });
    if (!media) return notFound();
    await db.listingMedia.delete({ where: { id: media.id } });
    const rest = await siblings(media.listingId);
    await db.$transaction(rest.map((m, order) => db.listingMedia.update({ where: { id: m.id }, data: { sortOrder: order, isPrimary: order === 0 } })));
    revalidateListings(media.listing.slug);
    return Response.json({ ok: true });
  },
  { limit: 120, bucket: "admin" },
);
