import { db } from "@/lib/db";
import { decodeBounds, type LngLat } from "@/lib/geo";
import { limitRequest, tooManyRequests } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/** Neighborhood or school-district outlines intersecting a bbox, as GeoJSON. */
export async function GET(request: Request) {
  const limit = await limitRequest(request, "geo", 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "district" ? "district" : "neighborhood";
  const bbox = decodeBounds(url.searchParams.get("bbox"));
  if (!bbox) return Response.json({ type: "FeatureCollection", features: [] });
  const [w, s, e, n] = bbox;
  const pad = 0.15;

  if (type === "neighborhood") {
    const rows = await db.neighborhood.findMany({
      where: { centerLat: { gte: s - pad, lte: n + pad }, centerLng: { gte: w - pad, lte: e + pad } },
      select: { name: true, slug: true, boundary: true, walkScore: true, medianPrice: true, city: { select: { slug: true } } },
      take: 200,
    });
    return Response.json(
      {
        type: "FeatureCollection",
        features: rows.map((r) => ({
          type: "Feature",
          properties: { name: r.name, slug: r.slug, citySlug: r.city.slug, walkScore: r.walkScore, medianPrice: r.medianPrice },
          geometry: r.boundary,
        })),
      },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
    );
  }

  const cities = await db.city.findMany({
    where: { lat: { gte: s - 0.5, lte: n + 0.5 }, lng: { gte: w - 0.5, lte: e + 0.5 } },
    select: { districts: { select: { name: true, slug: true, rating: true, boundary: true } } },
  });
  const features = cities.flatMap((c) =>
    c.districts
      .filter((d) => {
        const ring = (d.boundary as { coordinates: LngLat[][] }).coordinates[0] ?? [];
        return ring.some(([lng, lat]) => lng >= w - pad && lng <= e + pad && lat >= s - pad && lat <= n + pad);
      })
      .map((d) => ({
        type: "Feature",
        properties: { name: d.name, slug: d.slug, rating: d.rating, label: `${d.name}${d.rating ? ` · ${d.rating}/10` : ""}` },
        geometry: d.boundary,
      })),
  );
  return Response.json({ type: "FeatureCollection", features }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
}
