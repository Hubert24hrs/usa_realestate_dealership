"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import { MAPBOX_TOKEN } from "./map-config";
import type { PlaceMapProps } from "./place-map-core";

const Fallback = () => (
  <div className="grid h-full place-items-center rounded-2xl border bg-muted text-muted-foreground" aria-hidden>
    <MapPinned className="size-7 animate-pulse" />
  </div>
);

const MapLibrePlaceMap = dynamic(() => import("./place-map-maplibre"), { ssr: false, loading: Fallback });
const MapboxPlaceMap = dynamic(() => import("./place-map-mapbox"), { ssr: false, loading: Fallback });

/** Lazy: the map engine loads only when the map scrolls near the viewport. */
export function PlaceMap(props: PlaceMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setVisible(true), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ height: props.height ?? 360 }}>
      {visible ? (MAPBOX_TOKEN ? <MapboxPlaceMap {...props} /> : <MapLibrePlaceMap {...props} />) : <Fallback />}
    </div>
  );
}

export type { PlaceMapProps, PlaceMarker } from "./place-map-core";
