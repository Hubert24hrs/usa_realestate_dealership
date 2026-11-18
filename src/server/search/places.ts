import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Bounds, LngLat } from "@/lib/geo";
import { ringBounds } from "@/lib/geo";

export type PlaceType = "state" | "city" | "neighborhood" | "zip";

export interface ResolvedPlace {
  type: PlaceType;
  slug: string;
  label: string;
  shortLabel: string;
  stateCode: string;
  stateName?: string;
  stateSlug?: string;
  citySlug?: string;
  cityName?: string;
  cityId?: string;
  neighborhoodId?: string;
  zip?: string;
  center: { lat: number; lng: number };
  bbox?: Bounds;
  boundary?: LngLat[];
}

function padBounds([w, s, e, n]: Bounds, pad: number): Bounds {
  return [w - pad, s - pad, e + pad, n + pad];
}

export const resolvePlace = cache(async (slug: string | undefined): Promise<ResolvedPlace | null> => {
  if (!slug) return null;
  const clean = slug.toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(clean)) return null;

  if (/^\d{5}$/.test(clean)) {
    const rows = await db.listing.findMany({ where: { zip: clean }, select: { lat: true, lng: true, city: true, state: true }, take: 200 });
    if (!rows.length) return null;
    const ring = rows.map((r) => [r.lng, r.lat] as LngLat);
    const bbox = padBounds(ringBounds(ring), 0.01);
    return {
      type: "zip",
      slug: clean,
      label: `${clean} (${rows[0]!.city}, ${rows[0]!.state})`,
      shortLabel: clean,
      stateCode: rows[0]!.state,
      zip: clean,
      center: { lat: (bbox[1] + bbox[3]) / 2, lng: (bbox[0] + bbox[2]) / 2 },
      bbox,
    };
  }

  const [first, second] = clean.split("/");
  if (second) {
    const city = await db.city.findUnique({ where: { slug: first! }, include: { state: true } });
    if (!city) return null;
    const hood = await db.neighborhood.findUnique({ where: { cityId_slug: { cityId: city.id, slug: second } } });
    if (!hood) return null;
    const ring = (hood.boundary as { coordinates: LngLat[][] }).coordinates[0]!;
    return {
      type: "neighborhood",
      slug: clean,
      label: `${hood.name}, ${city.name}, ${city.stateCode}`,
      shortLabel: hood.name,
      stateCode: city.stateCode,
      stateName: city.state.name,
      stateSlug: city.state.slug,
      citySlug: city.slug,
      cityName: city.name,
      cityId: city.id,
      neighborhoodId: hood.id,
      center: { lat: hood.centerLat, lng: hood.centerLng },
      bbox: padBounds(ringBounds(ring), 0.004),
      boundary: ring,
    };
  }

  const state = await db.state.findUnique({ where: { slug: first! } });
  if (state) {
    const cities = await db.city.findMany({ where: { stateCode: state.code }, select: { lat: true, lng: true } });
    const ring = cities.map((c) => [c.lng, c.lat] as LngLat);
    const bbox = ring.length ? padBounds(ringBounds(ring), 0.35) : undefined;
    return {
      type: "state",
      slug: state.slug,
      label: state.name,
      shortLabel: state.name,
      stateCode: state.code,
      stateName: state.name,
      stateSlug: state.slug,
      center: bbox ? { lat: (bbox[1] + bbox[3]) / 2, lng: (bbox[0] + bbox[2]) / 2 } : { lat: 39.8, lng: -98.6 },
      bbox,
    };
  }

  const city = await db.city.findUnique({ where: { slug: first! }, include: { state: true } });
  if (city) {
    const spread = city.isRural ? 0.22 : 0.09;
    return {
      type: "city",
      slug: city.slug,
      label: `${city.name}, ${city.stateCode}`,
      shortLabel: city.name,
      stateCode: city.stateCode,
      stateName: city.state.name,
      stateSlug: city.state.slug,
      citySlug: city.slug,
      cityName: city.name,
      cityId: city.id,
      center: { lat: city.lat, lng: city.lng },
      bbox: [city.lng - spread * 1.3, city.lat - spread, city.lng + spread * 1.3, city.lat + spread],
    };
  }
  return null;
});

export function placeWhere(place: ResolvedPlace | null): Prisma.ListingWhereInput {
  if (!place) return {};
  switch (place.type) {
    case "state":
      return { state: place.stateCode };
    case "city":
      return { cityId: place.cityId };
    case "neighborhood":
      return { neighborhoodId: place.neighborhoodId };
    case "zip":
      return { zip: place.zip };
  }
}
