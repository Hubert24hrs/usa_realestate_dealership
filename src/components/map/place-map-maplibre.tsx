"use client";

import * as kit from "react-map-gl/maplibre";
import { getVersion, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { OPENFREEMAP_STYLES } from "./map-config";
import { PlaceMapCore, type PlaceMapProps } from "./place-map-core";

setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${getVersion()}`);

export default function MapLibrePlaceMap(props: PlaceMapProps) {
  const { resolvedTheme } = useTheme();
  return <PlaceMapCore {...props} kit={kit} mapStyle={resolvedTheme === "dark" ? OPENFREEMAP_STYLES.dark : OPENFREEMAP_STYLES.light} />;
}
