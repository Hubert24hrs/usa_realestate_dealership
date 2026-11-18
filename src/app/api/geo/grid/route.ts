import { db } from "@/lib/db";
import { decodeBounds } from "@/lib/geo";
import { hashString } from "@/lib/random";
import { limitRequest, tooManyRequests } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

type Metric = "walk" | "flood" | "crime" | "noise";

/**
 * DEMO data surfaces for map layers. Values are interpolated (inverse-distance
 * weighting) from seeded neighborhood statistics plus smooth noise — they are
 * illustrative only. Swap this route for a licensed data provider in production.
 */
export async function GET(request: Request) {
  const limit = await limitRequest(request, "geo", 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const url = new URL(request.url);
  const metric = (["walk", "flood", "crime", "noise"] as const).find((m) => m === url.searchParams.get("metric")) as Metric | undefined;
  const bbox = decodeBounds(url.searchParams.get("bbox"));
  if (!metric || !bbox) return Response.json({ points: [] });

  let [w, s, e, n] = bbox;
  const maxSpan = 1.4;
  if (n - s > maxSpan || e - w > maxSpan * 1.4) {
    const cy = (n + s) / 2;
    const cx = (e + w) / 2;
    s = cy - maxSpan / 2;
    n = cy + maxSpan / 2;
    w = cx - maxSpan * 0.7;
    e = cx + maxSpan * 0.7;
  }
  const pad = 0.2;
  const anchors = await db.neighborhood.findMany({
    where: { centerLat: { gte: s - pad, lte: n + pad }, centerLng: { gte: w - pad, lte: e + pad } },
    select: { centerLat: true, centerLng: true, radiusDeg: true, walkScore: true, floodRisk: true, crimeIndex: true, noiseLevel: true },
  });
  if (!anchors.length) return Response.json({ points: [] });

  const value = (a: (typeof anchors)[number]) =>
    metric === "walk" ? (a.walkScore ?? 40) / 100 : metric === "flood" ? (a.floodRisk ?? 2) / 10 : metric === "crime" ? (a.crimeIndex ?? 30) / 100 : (a.noiseLevel ?? 40) / 100;
  const seed = hashString(metric) % 1000;
  const cols = 22;
  const rows = 22;
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      const lng = w + ((e - w) * i) / cols;
      const lat = s + ((n - s) * j) / rows;
      let num = 0;
      let den = 0;
      let nearest = Infinity;
      for (const a of anchors) {
        const d = Math.hypot((lng - a.centerLng) * Math.cos((lat * Math.PI) / 180), lat - a.centerLat);
        nearest = Math.min(nearest, d / Math.max(0.004, a.radiusDeg * 2.5));
        const wgt = 1 / Math.max(1e-6, d * d);
        num += value(a) * wgt;
        den += wgt;
      }
      const base = den ? num / den : 0;
      const wave = 0.12 * Math.sin(lng * 37 + seed) * Math.cos(lat * 41 - seed * 0.7);
      const fade = Math.max(0, 1 - Math.max(0, nearest - 1) * 0.35);
      const v = Math.max(0, Math.min(1, (base + wave) * fade));
      if (v > 0.04) points.push([Number(lng.toFixed(4)), Number(lat.toFixed(4)), Number(v.toFixed(3))]);
    }
  }
  return Response.json({ metric, demo: true, points }, { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } });
}
