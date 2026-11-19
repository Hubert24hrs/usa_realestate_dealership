import { z } from "zod";
import { db } from "@/lib/db";
import { forbidden, readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";
import { getCollectionAccess } from "@/server/collections";

export const runtime = "nodejs";

const Patch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).nullable().optional(),
});

/** Rename / re-describe (owner only). */
export const PATCH = withUser<{ id: string }>(async ({ request, user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const found = await getCollectionAccess(params.id, user.id);
  if (!found) return notFound();
  if (found.access !== "OWNER") return forbidden("Only the owner can edit this collection");
  const parsed = await readJson(request, Patch, 4_000);
  if (!parsed.ok) return parsed.response;
  const { name, description } = parsed.data;
  await db.collection.update({
    where: { id: params.id },
    data: { ...(name ? { name } : {}), ...(description !== undefined ? { description: description || null } : {}) },
  });
  return Response.json({ ok: true });
});

/** Delete (owner only). Members lose access immediately. */
export const DELETE = withUser<{ id: string }>(async ({ user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const result = await db.collection.deleteMany({ where: { id: params.id, ownerId: user.id } });
  return result.count ? Response.json({ ok: true }) : notFound();
});
