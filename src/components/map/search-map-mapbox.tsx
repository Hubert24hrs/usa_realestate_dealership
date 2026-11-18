"use client";

import * as kit from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { MAPBOX_STYLES, MAPBOX_TOKEN } from "./map-config";
import { SearchMapCore, type SearchMapProps } from "./search-map-core";

export default function MapboxSearchMap(props: SearchMapProps) {
  const { resolvedTheme } = useTheme();
  return (
    <SearchMapCore
      {...props}
      kit={kit}
      mapboxAccessToken={MAPBOX_TOKEN}
      mapStyle={resolvedTheme === "dark" ? MAPBOX_STYLES.dark : MAPBOX_STYLES.light}
      textFont={["DIN Pro Medium", "Arial Unicode MS Regular"]}
      attribution="© Mapbox · © OpenStreetMap"
    />
  );
}
