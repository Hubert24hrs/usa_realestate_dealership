"use client";

import * as kit from "react-map-gl/maplibre";
import { getVersion, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";

// maplibre-gl v6 loads its worker from a sibling URL that bundled chunks don't provide;
// scripts/copy-vendor.mjs serves it from /vendor (version-stamped for cache busting).
setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${getVersion()}`);
import { OPENFREEMAP_STYLES } from "./map-config";
import { SearchMapCore, type SearchMapProps } from "./search-map-core";

export default function MapLibreSearchMap(props: SearchMapProps) {
  const { resolvedTheme } = useTheme();
  return (
    <SearchMapCore
      {...props}
      kit={kit}
      mapStyle={resolvedTheme === "dark" ? OPENFREEMAP_STYLES.dark : OPENFREEMAP_STYLES.light}
      textFont={["Noto Sans Bold"]}
      attribution="Tiles © OpenFreeMap · Data © OpenStreetMap contributors"
    />
  );
}
