"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "@/components/app-link";
import { Check, Layers, Loader2, PencilLine, Route, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ListingImage } from "@/components/media/listing-image";
import type { Bounds, LngLat } from "@/lib/geo";
import { displayPrice, factsLine, listingTitle } from "@/lib/listing-format";
import type { ListingCardData, MapPoint } from "@/lib/search/types";
import { cn } from "@/lib/utils";
import { COMMUTE_MINUTES, COMMUTE_SPEEDS_MPH, DATA_LAYERS, HEAT_RAMPS, MAP_COLORS, type CommuteMode, type DataLayer } from "./map-config";

/* The react-map-gl entry (maplibre or mapbox) is injected so the same core drives both engines. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyKit = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMap = any;

export interface SearchMapProps {
  points: MapPoint[];
  bbox: Bounds | null;
  fitKey: string;
  placeBoundary?: LngLat[] | null;
  polygon?: LngLat[] | null;
  hoveredId?: string | null;
  onHoverPoint?: (id: string | null) => void;
  searchAsMove: boolean;
  onSearchAsMoveChange: (value: boolean) => void;
  onBoundsChange: (bounds: Bounds) => void;
  onPolygonChange: (ring: LngLat[] | null) => void;
  loading?: boolean;
  className?: string;
}

interface CoreProps extends SearchMapProps {
  kit: AnyKit;
  mapStyle: string;
  textFont: string[];
  mapboxAccessToken?: string;
  attribution: string;
}

const EMPTY_FC = { type: "FeatureCollection" as const, features: [] as unknown[] };

function pillImage(fill: string, stroke: string) {
  const ratio = 2;
  const w = 44 * ratio;
  const h = 26 * ratio;
  const r = 13 * ratio;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.beginPath();
  ctx.moveTo(r, 2);
  ctx.arcTo(w - 2, 2, w - 2, h - 2, r - 2);
  ctx.arcTo(w - 2, h - 2, 2, h - 2, r - 2);
  ctx.arcTo(2, h - 2, 2, 2, r - 2);
  ctx.arcTo(2, 2, w - 2, 2, r - 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.shadowColor = "rgba(20,24,60,0.25)";
  ctx.shadowBlur = 3 * ratio;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  return {
    image: ctx.getImageData(0, 0, w, h),
    options: { pixelRatio: ratio, stretchX: [[r, w - r]], stretchY: [[r - 4, h - r + 4]], content: [r * 0.55, 6 * ratio, w - r * 0.55, h - 6 * ratio] },
  };
}

function ensureImages(map: AnyMap) {
  const defs: Record<string, [string, string]> = {
    "cv-pill": [MAP_COLORS.white, "rgba(29,33,64,0.18)"],
    "cv-pill-active": [MAP_COLORS.brand, MAP_COLORS.brand],
    "cv-pill-sold": ["#eef0f4", "rgba(29,33,64,0.18)"],
  };
  for (const [id, [fill, stroke]] of Object.entries(defs)) {
    if (!map.hasImage(id)) {
      const { image, options } = pillImage(fill, stroke);
      map.addImage(id, image, options);
    }
  }
}

function circleRing(center: { lat: number; lng: number }, miles: number, steps = 64): LngLat[] {
  const ring: LngLat[] = [];
  const latR = miles / 69;
  const lngR = miles / (69 * Math.cos((center.lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring.push([center.lng + Math.cos(a) * lngR, center.lat + Math.sin(a) * latR]);
  }
  return ring;
}

function quantiles(values: number[]): [number, number, number] {
  if (!values.length) return [0, 0, 0];
  const s = [...values].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
  return [q(0.25), q(0.5), q(0.75)];
}

export function SearchMapCore(props: CoreProps) {
  const { kit, mapStyle, textFont, points, bbox, fitKey, placeBoundary, polygon, hoveredId, onHoverPoint, searchAsMove, onSearchAsMoveChange, onBoundsChange, onPolygonChange, loading, className } = props;
  const { Map, Source, Layer, NavigationControl, GeolocateControl, ScaleControl, Popup } = kit;
  const mapRef = useRef<AnyMap>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<MapPoint | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<LngLat[]>([]);
  const [dataLayer, setDataLayer] = useState<DataLayer>("none");
  const [showHoods, setShowHoods] = useState(false);
  const [showDistricts, setShowDistricts] = useState(false);
  const [commuteMode, setCommuteMode] = useState<CommuteMode>("drive");
  const [commuteDest, setCommuteDest] = useState<{ lat: number; lng: number } | null>(null);
  const [pickingCommute, setPickingCommute] = useState(false);
  const [viewBounds, setViewBounds] = useState<Bounds | null>(bbox);

  const fc = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: { id: p.id, label: p.label, price: p.price, ppsf: p.ppsf ?? 0, status: p.status },
      })),
    }),
    [points],
  );
  const prices = useMemo(() => points.map((p) => p.price), [points]);
  const maxPrice = useMemo(() => Math.max(1, ...prices), [prices]);
  const ppsfQ = useMemo(() => quantiles(points.map((p) => p.ppsf ?? 0).filter(Boolean)), [points]);

  // Fit to results when the search (not the map) changed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bbox || !ready) return;
    const [w, s, e, n] = bbox;
    const pad = w === e || s === n ? 0.01 : 0;
    map.fitBounds([[w - pad, s - pad], [e + pad, n + pad]], { padding: 56, maxZoom: 14, duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, ready]);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (!map) return;
    ensureImages(map);
    map.on("styleimagemissing", () => ensureImages(map));
    setReady(true);
  }, []);

  const gridQuery = useQuery({
    queryKey: ["grid", dataLayer, viewBounds?.map((n) => n.toFixed(2)).join(",")],
    enabled: ["walk", "flood", "crime", "noise"].includes(dataLayer) && Boolean(viewBounds),
    queryFn: async () => {
      const res = await fetch(`/api/geo/grid?metric=${dataLayer}&bbox=${viewBounds!.join(",")}`);
      const json = (await res.json()) as { points: Array<[number, number, number]> };
      return {
        type: "FeatureCollection" as const,
        features: json.points.map(([lng, lat, v]) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [lng, lat] }, properties: { v } })),
      };
    },
    staleTime: 300_000,
  });

  const boundaryQuery = (type: "neighborhood" | "district", enabled: boolean) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ["boundaries", type, viewBounds?.map((n) => n.toFixed(1)).join(",")],
      enabled: enabled && Boolean(viewBounds),
      queryFn: async () => (await (await fetch(`/api/geo/boundaries?type=${type}&bbox=${viewBounds!.join(",")}`)).json()) as typeof EMPTY_FC,
      staleTime: 300_000,
    });
  const hoods = boundaryQuery("neighborhood", showHoods);
  const districts = boundaryQuery("district", showDistricts);

  const finishDrawing = useCallback(
    (ring: LngLat[]) => {
      setDrawing(false);
      setDraft([]);
      const map = mapRef.current?.getMap?.() ?? mapRef.current;
      map?.doubleClickZoom?.enable();
      if (ring.length >= 3) onPolygonChange(ring);
    },
    [onPolygonChange],
  );

  const handleClick = useCallback(
    (e: AnyMap) => {
      const map = mapRef.current?.getMap?.() ?? mapRef.current;
      const lngLat: LngLat = [e.lngLat.lng, e.lngLat.lat];
      if (pickingCommute) {
        setCommuteDest({ lng: lngLat[0], lat: lngLat[1] });
        setPickingCommute(false);
        return;
      }
      if (drawing) {
        const first = draft[0];
        if (first && draft.length >= 3) {
          const p1 = map.project(first);
          const p2 = map.project(lngLat);
          if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 14) return finishDrawing(draft);
        }
        setDraft((d) => [...d, lngLat]);
        return;
      }
      const feature = e.features?.[0];
      if (!feature) return setSelected(null);
      if (feature.properties?.cluster_id != null) {
        const source = map.getSource("listings");
        const coords = feature.geometry.coordinates;
        const done = (zoom: number) => map.easeTo({ center: coords, zoom: Math.min(16, zoom + 0.2), duration: 500 });
        const ret = source.getClusterExpansionZoom(feature.properties.cluster_id, (err: unknown, zoom: number) => {
          if (!err && typeof zoom === "number") done(zoom);
        });
        if (ret && typeof ret.then === "function") ret.then(done).catch(() => undefined);
        return;
      }
      const point = points.find((p) => p.id === feature.properties?.id);
      if (point) setSelected(point);
    },
    [draft, drawing, finishDrawing, pickingCommute, points],
  );

  const handleMove = useCallback(
    (e: AnyMap) => {
      if (drawing || pickingCommute) return;
      const id = e.features?.find((f: AnyMap) => f.properties?.id)?.properties?.id ?? null;
      onHoverPoint?.(id);
    },
    [drawing, onHoverPoint, pickingCommute],
  );

  const handleMoveEnd = useCallback(
    (e: AnyMap) => {
      const b = e.target.getBounds();
      const bounds: Bounds = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      setViewBounds(bounds);
      if (searchAsMove && e.originalEvent && !drawing) onBoundsChange(bounds);
    },
    [drawing, onBoundsChange, searchAsMove],
  );

  const commuteRings = useMemo(() => {
    if (!commuteDest) return EMPTY_FC;
    const mph = COMMUTE_SPEEDS_MPH[commuteMode];
    return {
      type: "FeatureCollection" as const,
      features: [...COMMUTE_MINUTES].reverse().map((min) => ({
        type: "Feature" as const,
        properties: { minutes: min, label: `${min} min` },
        geometry: { type: "Polygon" as const, coordinates: [circleRing(commuteDest, (mph * min) / 60 * 0.8)] },
      })),
    };
  }, [commuteDest, commuteMode]);

  const draftFc = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        ...(draft.length >= 2 ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: draft } }] : []),
        ...draft.map((c) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: c } })),
      ],
    }),
    [draft],
  );

  const outline = polygon ?? placeBoundary ?? null;
  const isSoldMap = points.length > 0 && points.every((p) => p.status === "SOLD");

  return (
    <section aria-label={`Map showing ${points.length} listings`} className={cn("relative h-full w-full overflow-hidden bg-muted", className)}>
      <p className="sr-only">Interactive map. Use the results list to browse every listing with a keyboard or screen reader.</p>
      <Map
        ref={mapRef}
        mapboxAccessToken={props.mapboxAccessToken}
        initialViewState={bbox ? { bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]], fitBoundsOptions: { padding: 56, maxZoom: 14 } } : { longitude: -97, latitude: 38.5, zoom: 3.3 }}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        onLoad={onLoad}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={() => onHoverPoint?.(null)}
        onMoveEnd={handleMoveEnd}
        onDblClick={(e: AnyMap) => {
          if (drawing) {
            e.preventDefault();
            finishDrawing(draft);
          }
        }}
        interactiveLayerIds={ready ? ["clusters", "unclustered", "unclustered-active"] : []}
        cursor={drawing || pickingCommute ? "crosshair" : hoveredId ? "pointer" : "grab"}
        attributionControl={{ compact: true, customAttribution: props.attribution }}
        dragRotate={false}
        touchPitch={false}
        maxZoom={18}
        minZoom={3}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        <GeolocateControl position="bottom-right" />
        <ScaleControl position="bottom-left" unit="imperial" />

        {showDistricts && districts.data && (
          <Source id="districts" type="geojson" data={districts.data}>
            <Layer id="districts-fill" type="fill" paint={{ "fill-color": MAP_COLORS.copper, "fill-opacity": 0.06 }} />
            <Layer id="districts-line" type="line" paint={{ "line-color": MAP_COLORS.copper, "line-width": 2, "line-dasharray": [3, 2] }} />
            <Layer id="districts-label" type="symbol" layout={{ "text-field": ["get", "label"], "text-font": textFont, "text-size": 12 }} paint={{ "text-color": "#9a4a12", "text-halo-color": "#fff", "text-halo-width": 1.5 }} />
          </Source>
        )}
        {showHoods && hoods.data && (
          <Source id="hoods" type="geojson" data={hoods.data}>
            <Layer id="hoods-fill" type="fill" paint={{ "fill-color": MAP_COLORS.brand, "fill-opacity": 0.05 }} />
            <Layer id="hoods-line" type="line" paint={{ "line-color": MAP_COLORS.brand, "line-width": 1.6, "line-opacity": 0.7 }} />
            <Layer id="hoods-label" type="symbol" layout={{ "text-field": ["get", "name"], "text-font": textFont, "text-size": 12 }} paint={{ "text-color": MAP_COLORS.brand, "text-halo-color": "#fff", "text-halo-width": 1.5 }} />
          </Source>
        )}

        {outline && (
          <Source id="outline" type="geojson" data={{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...outline, outline[0]]] } }}>
            <Layer id="outline-fill" type="fill" paint={{ "fill-color": polygon ? MAP_COLORS.copper : MAP_COLORS.brand, "fill-opacity": 0.08 }} />
            <Layer id="outline-line" type="line" paint={{ "line-color": polygon ? MAP_COLORS.copper : MAP_COLORS.brand, "line-width": 2.5, ...(polygon ? {} : { "line-dasharray": [2, 1.5] }) }} />
          </Source>
        )}
        {drawing && (
          <Source id="draft" type="geojson" data={draftFc}>
            <Layer id="draft-line" type="line" filter={["==", ["geometry-type"], "LineString"]} paint={{ "line-color": MAP_COLORS.copper, "line-width": 2.5 }} />
            <Layer id="draft-pts" type="circle" filter={["==", ["geometry-type"], "Point"]} paint={{ "circle-radius": 5, "circle-color": "#fff", "circle-stroke-color": MAP_COLORS.copper, "circle-stroke-width": 2.5 }} />
          </Source>
        )}

        {dataLayer === "commute" && commuteDest && (
          <Source id="commute" type="geojson" data={commuteRings}>
            <Layer id="commute-fill" type="fill" paint={{ "fill-color": ["match", ["get", "minutes"], 15, "#22c55e", 30, "#eab308", "#f97316"], "fill-opacity": 0.14 }} />
            <Layer id="commute-line" type="line" paint={{ "line-color": ["match", ["get", "minutes"], 15, "#16a34a", 30, "#ca8a04", "#ea580c"], "line-width": 1.6 }} />
          </Source>
        )}
        {["walk", "flood", "crime", "noise"].includes(dataLayer) && gridQuery.data && (
          <Source id="grid" type="geojson" data={gridQuery.data}>
            <Layer
              id="grid-heat"
              type="heatmap"
              paint={{
                "heatmap-weight": ["get", "v"],
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.7, 14, 1.6],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 18, 12, 40, 15, 70],
                "heatmap-opacity": 0.65,
                "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], ...HEAT_RAMPS[dataLayer as "walk"].flat()],
              }}
            />
          </Source>
        )}
        {(dataLayer === "price" || dataLayer === "ppsf") && (
          <Source id="listings-raw" type="geojson" data={fc}>
            {dataLayer === "price" ? (
              <Layer
                id="price-heat"
                type="heatmap"
                paint={{
                  "heatmap-weight": ["/", ["get", "price"], maxPrice],
                  "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 14, 2],
                  "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 22, 14, 60],
                  "heatmap-opacity": 0.6,
                  "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], ...HEAT_RAMPS.price.flat()],
                }}
              />
            ) : (
              <Layer
                id="ppsf-circles"
                type="circle"
                paint={{
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 14],
                  "circle-color": ["step", ["get", "ppsf"], "#22c55e", ppsfQ[0] || 1, "#84cc16", ppsfQ[1] || 2, "#f59e0b", ppsfQ[2] || 3, "#dc2626"],
                  "circle-opacity": 0.45,
                  "circle-stroke-width": 1,
                  "circle-stroke-color": "#fff",
                }}
              />
            )}
          </Source>
        )}

        <Source id="listings" type="geojson" data={fc} cluster clusterMaxZoom={13} clusterRadius={46}>
          <Layer
            id="clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": MAP_COLORS.brand,
              "circle-radius": ["step", ["get", "point_count"], 17, 10, 21, 40, 27],
              "circle-stroke-width": 5,
              "circle-stroke-color": "rgba(140,143,240,0.45)",
            }}
          />
          <Layer id="cluster-count" type="symbol" filter={["has", "point_count"]} layout={{ "text-field": ["get", "point_count_abbreviated"], "text-font": textFont, "text-size": 13 }} paint={{ "text-color": "#ffffff" }} />
          <Layer
            id="unclustered"
            type="symbol"
            filter={["!", ["has", "point_count"]]}
            layout={{
              "icon-image": isSoldMap ? "cv-pill-sold" : "cv-pill",
              "icon-text-fit": "both",
              "icon-text-fit-padding": [2, 8, 2, 8],
              "icon-allow-overlap": true,
              "text-allow-overlap": true,
              "text-field": ["get", "label"],
              "text-font": textFont,
              "text-size": 12.5,
            }}
            paint={{ "text-color": isSoldMap ? MAP_COLORS.sold : MAP_COLORS.ink }}
          />
          <Layer
            id="unclustered-active"
            type="symbol"
            filter={["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], hoveredId ?? selected?.id ?? "__none__"]]}
            layout={{
              "icon-image": "cv-pill-active",
              "icon-text-fit": "both",
              "icon-text-fit-padding": [3, 9, 3, 9],
              "icon-allow-overlap": true,
              "text-allow-overlap": true,
              "text-field": ["get", "label"],
              "text-font": textFont,
              "text-size": 13,
            }}
            paint={{ "text-color": "#ffffff" }}
          />
        </Source>

        {selected && (
          <Popup longitude={selected.lng} latitude={selected.lat} offset={18} closeButton={false} onClose={() => setSelected(null)} maxWidth="280px" className="cv-popup">
            <MapPopupCard point={selected} onClose={() => setSelected(null)} />
          </Popup>
        )}
      </Map>

      {/* Overlay controls */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <label className="pointer-events-auto inline-flex cursor-pointer items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-raised)]">
          <input type="checkbox" className="size-3.5 accent-[var(--primary)]" checked={searchAsMove} onChange={(e) => onSearchAsMoveChange(e.target.checked)} />
          Search as I move the map
        </label>
        <div className="pointer-events-auto flex items-center gap-1.5">
          {(loading || gridQuery.isFetching) && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
          {drawing ? (
            <>
              <Button size="sm" variant="secondary" className="rounded-full shadow" onClick={() => finishDrawing(draft)} disabled={draft.length < 3}>
                <Check className="size-3.5" aria-hidden /> Done
              </Button>
              <Button size="sm" variant="outline" className="rounded-full bg-background shadow" onClick={() => { setDrawing(false); setDraft([]); }}>
                <X className="size-3.5" aria-hidden /> Cancel
              </Button>
            </>
          ) : polygon ? (
            <Button size="sm" variant="outline" className="rounded-full bg-background shadow" onClick={() => onPolygonChange(null)}>
              <Trash2 className="size-3.5" aria-hidden /> Remove boundary
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full bg-background shadow"
              onClick={() => {
                const map = mapRef.current?.getMap?.() ?? mapRef.current;
                map?.doubleClickZoom?.disable();
                setSelected(null);
                setDrawing(true);
              }}
            >
              <PencilLine className="size-3.5" aria-hidden /> Draw
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-full bg-background shadow" aria-label="Map layers">
                <Layers className="size-3.5" aria-hidden /> Layers
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Boundaries</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={showHoods} onCheckedChange={(v) => setShowHoods(Boolean(v))}>Neighborhoods</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={showDistricts} onCheckedChange={(v) => setShowDistricts(Boolean(v))}>School districts</DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Data layer</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={dataLayer}
                onValueChange={(v) => {
                  setDataLayer(v as DataLayer);
                  if (v === "commute" && !commuteDest) setPickingCommute(true);
                }}
              >
                {DATA_LAYERS.map((l) => (
                  <DropdownMenuRadioItem key={l.id} value={l.id} className="flex-col items-start gap-0">
                    <span className="text-sm">{l.label}</span>
                    <span className="text-xs text-muted-foreground">{l.description}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(drawing || pickingCommute) && (
        <p role="status" className="absolute top-14 left-1/2 -translate-x-1/2 rounded-full bg-ink/90 px-3 py-1.5 text-xs font-medium text-background shadow">
          {pickingCommute ? "Click the map to set your commute destination" : draft.length < 3 ? "Click to add points around your area" : "Click the first point or double-click to finish"}
        </p>
      )}

      <MapLegend layer={dataLayer} ppsfQ={ppsfQ} commuteMode={commuteMode} onCommuteMode={setCommuteMode} onPickDestination={() => setPickingCommute(true)} hasDestination={Boolean(commuteDest)} />
    </section>
  );
}

function MapLegend({ layer, ppsfQ, commuteMode, onCommuteMode, onPickDestination, hasDestination }: { layer: DataLayer; ppsfQ: [number, number, number]; commuteMode: CommuteMode; onCommuteMode: (m: CommuteMode) => void; onPickDestination: () => void; hasDestination: boolean }) {
  if (layer === "none") return null;
  const meta = DATA_LAYERS.find((l) => l.id === layer)!;
  return (
    <div className="absolute bottom-8 left-3 w-60 rounded-xl border bg-background/95 p-3 text-xs shadow-[var(--shadow-raised)]">
      <p className="font-semibold">{meta.label}</p>
      {layer === "ppsf" ? (
        <ul className="mt-2 space-y-1">
          {[
            ["#22c55e", `Under $${ppsfQ[0]}/sqft`],
            ["#84cc16", `$${ppsfQ[0]}–${ppsfQ[1]}`],
            ["#f59e0b", `$${ppsfQ[1]}–${ppsfQ[2]}`],
            ["#dc2626", `Over $${ppsfQ[2]}/sqft`],
          ].map(([c, l]) => (
            <li key={l} className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: c }} />{l}</li>
          ))}
        </ul>
      ) : layer === "commute" ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-1">
            {(Object.keys(COMMUTE_SPEEDS_MPH) as CommuteMode[]).map((m) => (
              <button key={m} type="button" onClick={() => onCommuteMode(m)} className={cn("rounded-full border px-2 py-0.5 capitalize", m === commuteMode && "border-primary bg-primary text-primary-foreground")}>{m}</button>
            ))}
          </div>
          <div className="flex gap-2">{["#16a34a 15 min", "#ca8a04 30 min", "#ea580c 45 min"].map((s) => { const [c, ...t] = s.split(" "); return <span key={s} className="flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: c }} />{t.join(" ")}</span>; })}</div>
          <button type="button" onClick={onPickDestination} className="inline-flex items-center gap-1 font-medium text-primary"><Route className="size-3.5" aria-hidden /> {hasDestination ? "Change destination" : "Set destination"}</button>
          <p className="text-muted-foreground">Approximate rings at typical speeds — demo estimate.</p>
        </div>
      ) : (
        <>
          <div className="mt-2 h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${HEAT_RAMPS[layer as "price"].map(([, c]) => c).join(",")})` }} />
          <div className="mt-1 flex justify-between text-muted-foreground"><span>Lower</span><span>Higher</span></div>
          {layer !== "price" && <p className="mt-1.5 text-muted-foreground">Illustrative demo data layer — not for decisions.</p>}
        </>
      )}
    </div>
  );
}

function MapPopupCard({ point, onClose }: { point: MapPoint; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["card", point.id],
    queryFn: async () => (await (await fetch(`/api/listings/card?id=${point.id}`)).json()) as { listing: ListingCardData },
    staleTime: 300_000,
  });
  const l = data?.listing;
  return (
    <div className="w-64 overflow-hidden rounded-xl bg-popover text-popover-foreground">
      <div className="relative aspect-[16/10] bg-muted">
        {l?.photos[0] && <ListingImage src={l.photos[0].url} alt={l.photos[0].alt} blurDataUrl={l.photos[0].blurDataUrl} color={l.photos[0].color} fill sizes="256px" />}
        <button type="button" onClick={onClose} className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-white/90 text-ink shadow" aria-label="Close">
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      <div className="space-y-0.5 p-3">
        {isLoading || !l ? (
          <div className="space-y-1.5"><div className="skeleton-shimmer h-5 w-1/2 rounded" /><div className="skeleton-shimmer h-3.5 w-3/4 rounded" /></div>
        ) : (
          <>
            <p className="text-base font-semibold">{displayPrice(l)}</p>
            <p className="text-xs text-muted-foreground">{factsLine(l).join(" · ")}</p>
            <p className="truncate text-xs">{listingTitle(l)}, {l.city}, {l.state}</p>
            <Link href={`/property/${l.slug}`} className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">View details →</Link>
          </>
        )}
      </div>
    </div>
  );
}
