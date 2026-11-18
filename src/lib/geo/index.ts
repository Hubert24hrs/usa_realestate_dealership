/** Lightweight geo helpers (no PostGIS required). Coordinates are [lng, lat]. */
import type { Rng } from "@/lib/random";

export type LngLat = [number, number];
export type Bounds = [west: number, south: number, east: number, north: number];

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ray-casting point-in-polygon for a single outer ring. */
export function pointInPolygon(point: LngLat, ring: LngLat[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function ringBounds(ring: LngLat[]): Bounds {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of ring) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [west, south, east, north];
}

export function boundsContain(bounds: Bounds, lng: number, lat: number): boolean {
  const [w, s, e, n] = bounds;
  return lng >= w && lng <= e && lat >= s && lat <= n;
}

/** Compact, URL-safe polygon encoding: "lng,lat;lng,lat;…" (5 decimals ≈ 1.1 m). */
export function encodePolygon(ring: LngLat[]): string {
  return ring.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(";");
}

export function decodePolygon(value: string | null | undefined): LngLat[] | null {
  if (!value) return null;
  const points: LngLat[] = [];
  for (const pair of value.split(";")) {
    const [lngStr, latStr] = pair.split(",");
    const lng = Number(lngStr);
    const lat = Number(latStr);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return null;
    points.push([lng, lat]);
  }
  if (points.length < 3 || points.length > 200) return null;
  return points;
}

export function encodeBounds(bounds: Bounds): string {
  return bounds.map((n) => n.toFixed(4)).join(",");
}

export function decodeBounds(value: string | null | undefined): Bounds | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [w, s, e, n] = parts as Bounds;
  if (w >= e || s >= n || Math.abs(s) > 90 || Math.abs(n) > 90) return null;
  return [w, s, e, n];
}

/** Irregular "blob" polygon around a centre — used for demo neighborhood/district outlines. */
export function blobPolygon(center: { lat: number; lng: number }, radiusDeg: number, rng: Rng, vertices = 12): LngLat[] {
  const ring: LngLat[] = [];
  const lngScale = 1 / Math.cos((center.lat * Math.PI) / 180);
  for (let i = 0; i < vertices; i++) {
    const angle = (i / vertices) * Math.PI * 2;
    const r = radiusDeg * rng.float(0.78, 1.18);
    ring.push([
      Number((center.lng + Math.cos(angle) * r * lngScale).toFixed(6)),
      Number((center.lat + Math.sin(angle) * r).toFixed(6)),
    ]);
  }
  ring.push(ring[0]!);
  return ring;
}

/** Random point inside a circle around a centre (degrees, longitude-corrected). */
export function jitterPoint(center: { lat: number; lng: number }, radiusDeg: number, rng: Rng): { lat: number; lng: number } {
  const angle = rng.float(0, Math.PI * 2);
  const r = radiusDeg * Math.sqrt(rng.next());
  const lngScale = 1 / Math.cos((center.lat * Math.PI) / 180);
  return {
    lat: Number((center.lat + Math.sin(angle) * r).toFixed(6)),
    lng: Number((center.lng + Math.cos(angle) * r * lngScale).toFixed(6)),
  };
}

export function polygonFeature(ring: LngLat[], properties: Record<string, unknown> = {}) {
  return {
    type: "Feature" as const,
    properties,
    geometry: { type: "Polygon" as const, coordinates: [ring] },
  };
}
