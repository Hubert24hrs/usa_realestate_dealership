import { db } from "@/lib/db";
import { hasBlockingFinding } from "@/lib/fair-housing";
import { badRequest, readJson } from "@/lib/security/request";
import { AdminListingCreateSchema } from "@/lib/validation/admin";
import { listingSlug, placeFor } from "@/server/admin";
import { withRole } from "@/server/api";

export const runtime = "nodejs";

/** Create a draft listing; photos are added in the media manager before publishing. */
export const POST = withRole(
  ["ADMIN"],
  async ({ request }) => {
    const body = await readJson(request, AdminListingCreateSchema, 16_000);
    if (!body.ok) return body.response;
    const p = body.data;
    if (hasBlockingFinding(p.description)) return badRequest("The description has Fair Housing issues. Describe the property, not who should live there.");
    const city = await db.city.findUnique({ where: { slug: p.citySlug }, select: { id: true, name: true, stateCode: true, county: true, lat: true, lng: true } });
    if (!city) return badRequest("Unknown city");
    const slug = await listingSlug(p.streetAddress, p.unit, city.name, city.stateCode, p.zip);
    const { lat, lng } = placeFor(city, `${p.streetAddress}|${p.zip}`);
    const listing = await db.listing.create({
      data: {
        slug,
        category: p.category,
        transactionType: p.transactionType,
        propertyType: p.propertyType,
        status: "DRAFT",
        source: "ADMIN",
        isDemo: false,
        description: p.description,
        price: p.price,
        streetAddress: p.streetAddress,
        unit: p.unit || null,
        city: city.name,
        state: city.stateCode,
        zip: p.zip,
        county: city.county,
        lat,
        lng,
        cityId: city.id,
        listDate: new Date(),
      },
      select: { id: true },
    });
    return Response.json({ id: listing.id }, { status: 201 });
  },
  { limit: 30, bucket: "admin" },
);
