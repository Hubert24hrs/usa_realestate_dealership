import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { ImportRowSchema } from "@/lib/validation/admin";
import { listingSlug, placeFor, revalidateListings } from "@/server/admin";
import { withRole } from "@/server/api";

export const runtime = "nodejs";

const MAX_ROWS = 100;
const Body = z.object({
  rows: z
    .array(z.object({ line: z.number().int().min(1).max(100_000), data: z.record(z.string().max(60), z.string().max(12_000)) }))
    .min(1)
    .max(MAX_ROWS),
});

type RowError = { line: number; message: string };

/**
 * CSV import (one chunk of ≤100 rows). Every row is re-validated here — the browser preview is a
 * convenience, not a trust boundary. Imported listings land as DRAFTs: photos are added and each
 * draft is reviewed before it is published.
 */
export const POST = withRole(
  ["ADMIN"],
  async ({ request }) => {
    const body = await readJson(request, Body, 1_500_000);
    if (!body.ok) return body.response;
    const errors: RowError[] = [];
    const created: Array<{ line: number; id: string; slug: string }> = [];
    const cities = new Map<string, { id: string; name: string; stateCode: string; county: string | null; lat: number; lng: number } | null>();
    const seen = new Set<string>();

    for (const { line, data } of body.data.rows) {
      const parsed = ImportRowSchema.safeParse(data);
      if (!parsed.success) {
        const issue = parsed.error.issues[0]!;
        errors.push({ line, message: `${issue.path.join(".") || "row"}: ${issue.message}` });
        continue;
      }
      const r = parsed.data;
      if (r.category === "RENTAL" && r.transaction_type !== "RENT") {
        errors.push({ line, message: "Rentals need transaction_type RENT" });
        continue;
      }
      if (r.transaction_type === "RENT" && r.category !== "RENTAL" && r.category !== "COMMERCIAL") {
        errors.push({ line, message: "transaction_type RENT needs category RENTAL (or COMMERCIAL with LEASE)" });
        continue;
      }
      const cityKey = `${r.city.toLowerCase()}|${r.state}`;
      if (!cities.has(cityKey)) {
        cities.set(cityKey, await db.city.findFirst({ where: { name: { equals: r.city, mode: "insensitive" }, stateCode: r.state }, select: { id: true, name: true, stateCode: true, county: true, lat: true, lng: true } }));
      }
      const city = cities.get(cityKey);
      if (!city) {
        errors.push({ line, message: `City "${r.city}, ${r.state}" is not a CITI VIEW market yet` });
        continue;
      }
      const addrKey = `${r.street_address.toLowerCase()}|${r.unit.toLowerCase()}|${r.zip}`;
      if (seen.has(addrKey)) {
        errors.push({ line, message: "Duplicate of an earlier row in this file" });
        continue;
      }
      seen.add(addrKey);
      const dupe = await db.listing.count({ where: { streetAddress: { equals: r.street_address, mode: "insensitive" }, unit: r.unit ? { equals: r.unit, mode: "insensitive" } : null, zip: r.zip } });
      if (dupe) {
        errors.push({ line, message: "A listing at this address already exists" });
        continue;
      }
      if (r.mls_number && (await db.listing.count({ where: { mlsNumber: r.mls_number } }))) {
        errors.push({ line, message: `MLS # ${r.mls_number} already exists` });
        continue;
      }
      const slug = await listingSlug(r.street_address, r.unit, city.name, city.stateCode, r.zip);
      const { lat, lng } = placeFor(city, `${r.street_address}|${r.zip}`);
      const listing = await db.listing.create({
        data: {
          slug,
          mlsNumber: r.mls_number || null,
          category: r.category,
          transactionType: r.transaction_type,
          propertyType: r.property_type,
          status: "DRAFT",
          source: "ADMIN",
          isDemo: false,
          headline: r.headline || null,
          description: r.description,
          price: r.price,
          pricePerSqft: r.transaction_type === "SALE" && r.sqft ? Math.round(r.price / r.sqft) : null,
          streetAddress: r.street_address,
          unit: r.unit || null,
          city: city.name,
          state: city.stateCode,
          zip: r.zip,
          county: city.county,
          lat,
          lng,
          cityId: city.id,
          beds: r.beds ?? null,
          baths: r.baths ?? null,
          sqft: r.sqft ?? null,
          lotSqft: r.lot_sqft ?? null,
          lotAcres: r.lot_sqft ? Math.round((r.lot_sqft / 43_560) * 100) / 100 : null,
          yearBuilt: r.year_built ?? null,
          attribution: "Imported by CITI VIEW staff",
        },
        select: { id: true, slug: true },
      });
      created.push({ line, ...listing });
    }
    if (created.length) revalidateListings();
    return Response.json({ created, errors });
  },
  { limit: 60, bucket: "admin-import" },
);
