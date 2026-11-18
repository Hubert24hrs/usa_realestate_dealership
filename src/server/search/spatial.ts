import "server-only";
import { db } from "@/lib/db";
import type { LngLat } from "@/lib/geo";

let postgisCache: { value: boolean; at: number } | null = null;

/** True when the database has the optional PostGIS layer (geo.listing_location). Cached for 5 min. */
export async function hasPostgis(): Promise<boolean> {
  if (postgisCache && Date.now() - postgisCache.at < 300_000) return postgisCache.value;
  try {
    const rows = await db.$queryRaw<Array<{ ok: boolean }>>`SELECT to_regclass('geo.listing_location') IS NOT NULL AS ok`;
    postgisCache = { value: Boolean(rows[0]?.ok), at: Date.now() };
  } catch {
    postgisCache = { value: false, at: Date.now() };
  }
  return postgisCache.value;
}

function closeRing(ring: LngLat[]): LngLat[] {
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
}

/** Listing ids inside a drawn polygon, via PostGIS (ST_Intersects on geography). */
export async function idsWithinPolygon(ring: LngLat[]): Promise<string[]> {
  const geojson = JSON.stringify({ type: "Polygon", coordinates: [closeRing(ring)] });
  const rows = await db.$queryRaw<Array<{ listing_id: string }>>`
    SELECT listing_id FROM geo.listing_location
    WHERE ST_Intersects(location, ST_GeomFromGeoJSON(${geojson})::geography)`;
  return rows.map((r) => r.listing_id);
}

/** Listing ids within `miles` of a point, via PostGIS (ST_DWithin). */
export async function idsWithinRadius(center: { lat: number; lng: number }, miles: number): Promise<string[]> {
  const meters = miles * 1609.344;
  const rows = await db.$queryRaw<Array<{ listing_id: string }>>`
    SELECT listing_id FROM geo.listing_location
    WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography, ${meters})`;
  return rows.map((r) => r.listing_id);
}
