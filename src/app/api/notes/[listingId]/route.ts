import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";

export const runtime = "nodejs";

export const GET = withUser<{ listingId: string }>(async ({ user, params }) => {
  if (!ID_RE.test(params.listingId)) return notFound();
  const note = await db.note.findUnique({ where: { userId_listingId: { userId: user.id, listingId: params.listingId } }, select: { body: true, updatedAt: true } });
  return Response.json({ body: note?.body ?? "", updatedAt: note?.updatedAt ?? null });
});

const Body = z.object({ body: z.string().max(5000) });

export const PUT = withUser<{ listingId: string }>(async ({ request, user, params }) => {
  if (!ID_RE.test(params.listingId)) return notFound();
  const parsed = await readJson(request, Body, 12_000);
  if (!parsed.ok) return parsed.response;
  const listing = await db.listing.findUnique({ where: { id: params.listingId }, select: { id: true } });
  if (!listing) return notFound();
  const text = parsed.data.body.trim();
  if (!text) {
    await db.note.deleteMany({ where: { userId: user.id, listingId: listing.id } });
    return Response.json({ ok: true, deleted: true });
  }
  await db.note.upsert({
    where: { userId_listingId: { userId: user.id, listingId: listing.id } },
    create: { userId: user.id, listingId: listing.id, body: text },
    update: { body: text },
  });
  return Response.json({ ok: true });
});
