"use client";

import { useMemo, useState } from "react";
import { Coffee, Dumbbell, GraduationCap, Hospital, House, Landmark, Library, ShoppingBag, ShoppingCart, Train, Trees, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LngLat } from "@/lib/geo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyKit = any;

export interface PlaceMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: "home" | "amenity" | "school";
  type?: string;
}

export interface PlaceMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers: PlaceMarker[];
  parcel?: LngLat[] | null;
  terrainControls?: boolean;
  height?: number;
  label: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  GROCERY: ShoppingCart,
  PARK: Trees,
  RESTAURANT: UtensilsCrossed,
  COFFEE: Coffee,
  GYM: Dumbbell,
  TRANSIT: Train,
  HOSPITAL: Hospital,
  SHOPPING: ShoppingBag,
  LIBRARY: Library,
  SCHOOL: GraduationCap,
};

const TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const SOIL_WMS =
  process.env.NEXT_PUBLIC_SOIL_WMS_URL ??
  "https://SDMDataAccess.sc.egov.usda.gov/Spatial/SDM.wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=mapunitpoly&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true";

export function PlaceMapCore({ kit, mapStyle, mapboxAccessToken, center, zoom = 13.5, markers, parcel, terrainControls = false, height = 360, label }: PlaceMapProps & { kit: AnyKit; mapStyle: string; mapboxAccessToken?: string }) {
  const { Map, Marker, NavigationControl, Source, Layer } = kit;
  const [hillshade, setHillshade] = useState(terrainControls);
  const [soil, setSoil] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const parcelFeature = useMemo(() => (parcel ? { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...parcel, parcel[0]]] } } : null), [parcel]);

  return (
    <div className="relative overflow-hidden rounded-2xl border" style={{ height }} role="region" aria-label={label}>
      <Map
        mapboxAccessToken={mapboxAccessToken}
        initialViewState={{ longitude: center.lng, latitude: center.lat, zoom }}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        attributionControl={{ compact: true, customAttribution: hillshade ? "Terrain: Terrain Tiles on AWS (Mapzen)" : undefined }}
        scrollZoom={false}
        dragRotate={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {hillshade && (
          <Source id="terrain" type="raster-dem" tiles={[TERRARIUM]} tileSize={256} encoding="terrarium" maxzoom={15}>
            <Layer id="hillshade" type="hillshade" paint={{ "hillshade-exaggeration": 0.55, "hillshade-shadow-color": "#3a3326", "hillshade-highlight-color": "#ffffff" }} />
          </Source>
        )}
        {soil && (
          <Source id="soil" type="raster" tiles={[SOIL_WMS]} tileSize={256}>
            <Layer id="soil-layer" type="raster" paint={{ "raster-opacity": 0.75 }} />
          </Source>
        )}
        {parcelFeature && (
          <Source id="parcel" type="geojson" data={parcelFeature}>
            <Layer id="parcel-fill" type="fill" paint={{ "fill-color": "#e08a3c", "fill-opacity": 0.12 }} />
            <Layer id="parcel-line" type="line" paint={{ "line-color": "#c2410c", "line-width": 2.5, "line-dasharray": [3, 2] }} />
          </Source>
        )}
        {markers.map((m) => {
          const Icon = m.kind === "home" ? House : ICONS[m.type ?? ""] ?? Landmark;
          return (
            <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor={m.kind === "home" ? "bottom" : "center"}>
              <button
                type="button"
                onMouseEnter={() => setActive(m.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(m.id)}
                onBlur={() => setActive(null)}
                aria-label={m.label}
                className={cn(
                  "relative grid place-items-center rounded-full border-2 border-white shadow-[var(--shadow-raised)]",
                  m.kind === "home" ? "size-10 bg-primary text-primary-foreground" : "size-7 bg-card text-foreground",
                )}
              >
                <Icon className={m.kind === "home" ? "size-5" : "size-3.5"} aria-hidden />
                {active === m.id && <span className="absolute bottom-full mb-1.5 rounded-md bg-ink px-2 py-1 text-[0.7rem] font-medium whitespace-nowrap text-background">{m.label}</span>}
              </button>
            </Marker>
          );
        })}
      </Map>
      {terrainControls && (
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 rounded-xl border bg-background/95 p-2.5 text-xs shadow-[var(--shadow-raised)]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={hillshade} onChange={(e) => setHillshade(e.target.checked)} /> Topography (hillshade)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={soil} onChange={(e) => setSoil(e.target.checked)} /> Soil survey (USDA SSURGO)</label>
          {soil && <span className="max-w-48 text-muted-foreground">External public service — tiles may load slowly or be unavailable.</span>}
        </div>
      )}
    </div>
  );
}
