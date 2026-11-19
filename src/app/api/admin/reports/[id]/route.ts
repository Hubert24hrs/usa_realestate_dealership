import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { revalidateListings } from "@/server/admin";
import { ID_RE, notFound, withRole } from "@/server/api";

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum(["dismiss", "resolve", "unpublish"]),
  resolution: z.string().trim().max(1_000).optional(),
});

/**
 * Moderate a listing report. "unpublish" takes the listing off market (it stays in the database
 * with its history so it can be corrected and relisted) and resolves every open report on it.
 */
export const PATCH = withRole<{ id: string }>(
  ["ADMIN"],
  async ({ request, user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, Body, 2_000);
    if (!body.ok) return body.response;
    const report = await db.report.findUnique({ where: { id: params.id }, select: { id: true, listingId: true, listing: { select: { slug: true, status: true, price: true } } } });
    if (!report) return notFound();
    const { action, resolution } = body.data;
    const now = new Date();
    const close = { status: action === "dismiss" ? ("DISMISSED" as const) : ("RESOLVED" as const), resolution: resolution || null, resolvedById: user.id, resolvedAt: now };
    if (action === "unpublish") {
      await db.$transaction([
        db.listing.update({ where: { id: report.listingId }, data: { status: "OFF_MARKET" } }),
        db.priceHistory.create({ data: { listingId: report.listingId, date: now, event: "DELISTED", price: report.listing.price, source: "CITI VIEW moderation" } }),
        db.report.updateMany({ where: { listingId: report.listingId, status: "OPEN" }, data: { ...close, resolution: resolution || "Listing unpublished after review" } }),
      ]);
      revalidateListings(report.listing.slug);
    } else {
      await db.report.update({ where: { id: report.id }, data: close });
    }
    return Response.json({ ok: true });
  },
  { limit: 120, bucket: "admin" },
);
