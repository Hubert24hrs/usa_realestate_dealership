"use client";

import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";
import { MAPBOX_TOKEN } from "./map-config";
import type { SearchMapProps } from "./search-map-core";

function MapSkeleton() {
  return (
    <div className="grid h-full w-full place-items-center bg-muted" aria-hidden>
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <MapPinned className="size-8 animate-pulse" />
        <span className="text-xs font-medium">Loading map…</span>
      </div>
    </div>
  );
}

// Code-split: the map engine (≈200 KB gz) only loads when a map is actually shown.
const MapLibreSearchMap = dynamic(() => import("./search-map-maplibre"), { ssr: false, loading: MapSkeleton });
const MapboxSearchMap = dynamic(() => import("./search-map-mapbox"), { ssr: false, loading: MapSkeleton });

export function SearchMap(props: SearchMapProps) {
  return MAPBOX_TOKEN ? <MapboxSearchMap {...props} /> : <MapLibreSearchMap {...props} />;
}

export type { SearchMapProps };
