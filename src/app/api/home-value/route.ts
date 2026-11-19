import { z } from "zod";
import { limitRequest, tooManyRequests } from "@/lib/security/rate-limit";
import { forbidden, isSameOrigin, readJson } from "@/lib/security/request";
import { estimateHomeValue } from "@/server/home-value";

export const runtime = "nodejs";

const year = new Date().getFullYear();
const HomeValueSchema = z.object({
  address: z.string().trim().max(160).optional().or(z.literal("")),
  citySlug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  zip: z.string().trim().regex(/^(\d{5})?$/).optional(),
  propertyType: z.enum(["SINGLE_FAMILY", "TOWNHOUSE", "CONDO", "MULTI_FAMILY", "MANUFACTURED"]),
  beds: z.coerce.number().int().min(0).max(12),
  baths: z.coerce.number().min(0).max(12),
  sqft: z.coerce.number().int().min(300).max(20_000),
  yearBuilt: z.coerce.number().int().min(1800).max(year + 1).optional(),
  hasPool: z.boolean().optional(),
  garageSpaces: z.coerce.number().int().min(0).max(6).optional(),
  condition: z.enum(["needs-work", "average", "updated", "renovated"]),
});

/** Public, rate-limited home value estimate. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const limit = await limitRequest(request, "home-value", 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const body = await readJson(request, HomeValueSchema, 4_000);
  if (!body.ok) return body.response;
  const result = await estimateHomeValue({ ...body.data, address: body.data.address || undefined, zip: body.data.zip || undefined });
  if (!result?.valuation) return Response.json({ error: "We don't have enough data for that market yet." }, { status: 422 });
  const v = result.valuation;
  return Response.json({
    value: v.value,
    low: v.low,
    high: v.high,
    confidence: v.confidence,
    pricePerSqft: v.pricePerSqft,
    compsUsed: v.compsUsed,
    usedMarketData: v.marketWeight > 0.3,
    comps: v.comps.map((r) => ({
      slug: r.comp.slug,
      address: r.comp.address,
      status: r.comp.status,
      price: r.comp.price,
      date: r.comp.date.toISOString(),
      beds: r.comp.beds,
      baths: r.comp.baths,
      sqft: r.comp.sqft,
      photo: r.comp.photo,
      distanceMi: r.distanceMi == null ? null : Number(r.distanceMi.toFixed(1)),
      adjustedValue: Math.round(r.adjustedValue),
      adjustments: r.adjustments,
      similarity: Number(r.similarity.toFixed(3)),
    })),
    market: result.market,
  });
}
