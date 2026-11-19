import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";

export const runtime = "nodejs";

const Patch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  frequency: z.enum(["INSTANT", "DAILY", "WEEKLY", "NONE"]).optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

export const PATCH = withUser<{ id: string }>(async ({ request, user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const parsed = await readJson(request, Patch, 4_000);
  if (!parsed.ok) return parsed.response;
  const result = await db.savedSearch.updateMany({ where: { id: params.id, userId: user.id }, data: parsed.data });
  return result.count ? Response.json({ ok: true }) : notFound();
});

export const DELETE = withUser<{ id: string }>(async ({ user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const result = await db.savedSearch.deleteMany({ where: { id: params.id, userId: user.id } });
  return result.count ? Response.json({ ok: true }) : notFound();
});
