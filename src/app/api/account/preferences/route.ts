import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { withUser } from "@/server/api";

export const runtime = "nodejs";

const Prefs = z
  .object({
    emailListingAlerts: z.boolean(),
    pushListingAlerts: z.boolean(),
    emailPriceDrops: z.boolean(),
    emailTourUpdates: z.boolean(),
    emailMessages: z.boolean(),
    emailNewsletter: z.boolean(),
    alertDigest: z.enum(["INSTANT", "DAILY", "WEEKLY", "NONE"]),
  })
  .partial();

export const PATCH = withUser(async ({ request, user }) => {
  const parsed = await readJson(request, Prefs, 2_000);
  if (!parsed.ok) return parsed.response;
  const prefs = await db.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, ...parsed.data }, update: parsed.data });
  return Response.json({ ok: true, prefs });
});
