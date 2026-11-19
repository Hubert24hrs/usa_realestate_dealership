import { revalidateTag } from "next/cache";
import type { ListingStatus, PriceEvent, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";
import { canManageListing, getProScope } from "@/server/pro";

export const runtime = "nodejs";

const Body = z
  .object({
    status: z.enum(["ACTIVE", "COMING_SOON", "PENDING", "SOLD", "RENTED", "OFF_MARKET"]).optional(),
    price: z.coerce.number().int().min(100).max(1_000_000_000).optional(),
    soldPrice: z.coerce.number().int().min(100).max(1_000_000_000).optional(),
  })
  .refine((v) => v.status || v.price, "Nothing to update");

const STATUS_EVENT: Partial<Record<ListingStatus, PriceEvent>> = { PENDING: "PENDING", SOLD: "SOLD", RENTED: "RENTED", OFF_MARKET: "DELISTED" };

/**
 * Status and price changes for the people responsible for a listing: its owner (FSBO),
 * the listing agent / company (pro scope) or an admin. Writes price-history events.
 */
export const PATCH = withUser<{ id: string }>(
  async ({ request, user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, Body, 1_000);
    if (!body.ok) return body.response;
    const listing = await db.listing.findUnique({ where: { id: params.id }, select: { id: true, ownerId: true, status: true, price: true, originalPrice: true, sqft: true, transactionType: true } });
    if (!listing) return notFound();
    const allowed = listing.ownerId === user.id || (await canManageListing(await getProScope(user), listing.id));
    if (!allowed) return notFound();

    const { status, price, soldPrice } = body.data;
    if (status === "SOLD" && listing.transactionType !== "SALE") return badRequest("Use “Rented” for rentals.");
    if (status === "RENTED" && listing.transactionType === "SALE") return badRequest("Use “Sold” for homes for sale.");
    const now = new Date();
    const data: Prisma.ListingUpdateInput = {};
    const events: Prisma.PriceHistoryCreateManyInput[] = [];

    if (price && price !== listing.price) {
      data.price = price;
      data.originalPrice = listing.originalPrice ?? listing.price;
      if (listing.sqft && listing.transactionType === "SALE") data.pricePerSqft = Math.round(price / listing.sqft);
      if (price < listing.price) {
        data.priceReducedAt = now;
        data.priceReduction = listing.price - price;
      }
      events.push({ listingId: listing.id, date: now, event: "PRICE_CHANGE", price, source: "Listing update" });
    }
    if (status && status !== listing.status) {
      data.status = status;
      if (status === "SOLD") {
        data.soldDate = now;
        data.soldPrice = soldPrice ?? price ?? listing.price;
      }
      const event = listing.status === "OFF_MARKET" && status === "ACTIVE" ? "RELISTED" : STATUS_EVENT[status];
      if (event) events.push({ listingId: listing.id, date: now, event, price: status === "SOLD" ? (soldPrice ?? price ?? listing.price) : (price ?? listing.price), source: "Listing update" });
    }
    if (!Object.keys(data).length) return Response.json({ ok: true, unchanged: true });
    await db.$transaction([db.listing.update({ where: { id: listing.id }, data }), db.priceHistory.createMany({ data: events })]);
    revalidateTag("listings");
    return Response.json({ ok: true });
  },
  { limit: 60, bucket: "listing-manage" },
);
