import type { ListingStatus, PriceEvent, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasBlockingFinding } from "@/lib/fair-housing";
import { badRequest, readJson } from "@/lib/security/request";
import { AdminListingUpdateSchema } from "@/lib/validation/admin";
import { revalidateListings } from "@/server/admin";
import { ID_RE, notFound, withRole } from "@/server/api";

export const runtime = "nodejs";

const STATUS_EVENT: Partial<Record<ListingStatus, PriceEvent>> = { PENDING: "PENDING", SOLD: "SOLD", RENTED: "RENTED", OFF_MARKET: "DELISTED", DRAFT: "DELISTED" };

/** Edit any listing field an admin manages. Publishing a draft requires at least one photo. */
export const PATCH = withRole<{ id: string }>(
  ["ADMIN"],
  async ({ request, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, AdminListingUpdateSchema, 24_000);
    if (!body.ok) return body.response;
    const listing = await db.listing.findUnique({ where: { id: params.id }, select: { id: true, slug: true, status: true, price: true, originalPrice: true, sqft: true, transactionType: true, _count: { select: { media: true } } } });
    if (!listing) return notFound();
    const p = body.data;
    if (hasBlockingFinding(`${p.headline ?? ""}\n${p.description ?? ""}`)) return badRequest("The listing copy has Fair Housing issues. Describe the property, not who should live there.");
    if (p.status && p.status !== "DRAFT" && listing.status === "DRAFT" && listing._count.media === 0) return badRequest("Add at least one photo before publishing.");
    if (p.status === "SOLD" && listing.transactionType !== "SALE") return badRequest("Use “Rented” for rentals and leases.");
    if (p.status === "RENTED" && listing.transactionType === "SALE") return badRequest("Use “Sold” for homes for sale.");
    if (p.agentId && !(await db.agent.count({ where: { id: p.agentId } }))) return badRequest("Unknown agent");

    const now = new Date();
    const data: Prisma.ListingUncheckedUpdateInput = {};
    const events: Prisma.PriceHistoryCreateManyInput[] = [];
    if (p.headline !== undefined) data.headline = p.headline || null;
    if (p.description !== undefined) data.description = p.description;
    for (const k of ["beds", "baths", "sqft", "lotSqft", "yearBuilt", "hoaFee"] as const) if (p[k] !== undefined) data[k] = p[k];
    if (p.agentId !== undefined) data.agentId = p.agentId;
    if (p.flags) Object.assign(data, p.flags);
    if (p.status && p.status !== listing.status) {
      data.status = p.status;
      if (p.status === "SOLD") {
        data.soldDate = now;
        data.soldPrice = p.price ?? listing.price;
      }
      // Status events for live listings (publishing a draft is logged as LISTED below).
      const event = listing.status === "DRAFT" ? undefined : listing.status === "OFF_MARKET" && p.status === "ACTIVE" ? "RELISTED" : STATUS_EVENT[p.status];
      if (event) events.push({ listingId: listing.id, date: now, event, price: p.price ?? listing.price, source: "Admin" });
    }
    const priceChanged = Boolean(p.price && p.price !== listing.price);
    if (priceChanged && p.price) {
      data.price = p.price;
      if (listing.status !== "DRAFT") {
        data.originalPrice = listing.originalPrice ?? listing.price;
        if (p.price < listing.price) {
          data.priceReducedAt = now;
          data.priceReduction = listing.price - p.price;
        }
        events.push({ listingId: listing.id, date: now, event: "PRICE_CHANGE", price: p.price, source: "Admin" });
      }
    }
    if (listing.transactionType === "SALE" && (priceChanged || p.sqft !== undefined)) {
      const sqft = p.sqft === undefined ? listing.sqft : p.sqft;
      data.pricePerSqft = sqft ? Math.round((p.price ?? listing.price) / sqft) : null;
    }
    if (listing.status === "DRAFT" && p.status && p.status !== "DRAFT") {
      data.listDate = now;
      events.push({ listingId: listing.id, date: now, event: "LISTED", price: p.price ?? listing.price, source: "Admin" });
    }
    await db.$transaction([db.listing.update({ where: { id: listing.id }, data }), db.priceHistory.createMany({ data: events })]);
    revalidateListings(listing.slug);
    return Response.json({ ok: true });
  },
  { limit: 120, bucket: "admin" },
);

const DeleteBody = z.object({ confirm: z.literal("DELETE") });

/** Permanently delete a listing (and its media, history, saves). Requires typed confirmation. */
export const DELETE = withRole<{ id: string }>(
  ["ADMIN"],
  async ({ request, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, DeleteBody, 200);
    if (!body.ok) return body.response;
    const listing = await db.listing.findUnique({ where: { id: params.id }, select: { id: true, slug: true, _count: { select: { applications: true, leases: true } } } });
    if (!listing) return notFound();
    // Rental applications and leases are financial records — never cascade-delete them.
    if (listing._count.applications || listing._count.leases)
      return Response.json({ error: "This listing has rental applications or leases. Take it off market instead." }, { status: 409 });
    await db.listing.delete({ where: { id: listing.id } });
    revalidateListings(listing.slug);
    return Response.json({ ok: true });
  },
  { limit: 30, bucket: "admin" },
);
