import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { withUser } from "@/server/api";

export const runtime = "nodejs";

export const GET = withUser(async ({ user }) => {
  const notifications = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return Response.json({ notifications });
});

const Body = z.object({ ids: z.array(z.string().max(40)).max(100).optional(), all: z.boolean().optional() });

/** Mark notifications read (specific ids, or all). */
export const PATCH = withUser(async ({ request, user }) => {
  const parsed = await readJson(request, Body, 8_000);
  if (!parsed.ok) return parsed.response;
  const where = parsed.data.all ? { userId: user.id, readAt: null } : { userId: user.id, id: { in: parsed.data.ids ?? [] } };
  const result = await db.notification.updateMany({ where, data: { readAt: new Date() } });
  return Response.json({ ok: true, updated: result.count });
});
