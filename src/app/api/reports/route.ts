import { z } from "zod";
import { db } from "@/lib/db";
import { limitRequest, tooManyRequests } from "@/lib/security/rate-limit";
import { forbidden, isSameOrigin, readJson } from "@/lib/security/request";
import { getSessionUser } from "@/server/auth-helpers";

export const runtime = "nodejs";

const Body = z.object({
  listingId: z.string().min(10).max(40),
  reason: z.enum(["INACCURATE_INFO", "SCAM_OR_FRAUD", "DISCRIMINATORY_LANGUAGE", "DUPLICATE", "NO_LONGER_AVAILABLE", "INAPPROPRIATE_MEDIA", "OTHER"]),
  details: z.string().trim().max(2000).optional(),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
});

/** Report a listing → moderation queue (/admin/moderation). */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const limit = await limitRequest(request, "reports", 5, 600_000);
  if (!limit.ok) return tooManyRequests(limit);
  const body = await readJson(request, Body, 8_000);
  if (!body.ok) return body.response;
  const listing = await db.listing.findUnique({ where: { id: body.data.listingId }, select: { id: true } });
  if (!listing) return Response.json({ error: "Listing not found" }, { status: 404 });
  const user = await getSessionUser();
  await db.report.create({ data: { listingId: listing.id, reason: body.data.reason, details: body.data.details || null, email: body.data.email || null, userId: user?.id ?? null } });
  return Response.json({ ok: true });
}
