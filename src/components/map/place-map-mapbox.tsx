"use client";

import * as kit from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { MAPBOX_STYLES, MAPBOX_TOKEN } from "./map-config";
import { PlaceMapCore, type PlaceMapProps } from "./place-map-core";

export default function MapboxPlaceMap(props: PlaceMapProps) {
  const { resolvedTheme } = useTheme();
  return <PlaceMapCore {...props} kit={kit} mapboxAccessToken={MAPBOX_TOKEN} mapStyle={resolvedTheme === "dark" ? MAPBOX_STYLES.dark : MAPBOX_STYLES.light} />;
}
