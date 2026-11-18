export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Free, key-less vector tiles (OpenStreetMap data) used when no Mapbox token is configured. */
export const OPENFREEMAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

export const MAPBOX_STYLES = {
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
};

export const MAP_COLORS = {
  brand: "#3a37a3",
  brandLight: "#8c8ff0",
  copper: "#e08a3c",
  ink: "#1d2140",
  white: "#ffffff",
  sold: "#6b7080",
};

export type DataLayer = "none" | "price" | "ppsf" | "commute" | "walk" | "flood" | "crime" | "noise";

export const DATA_LAYERS: Array<{ id: DataLayer; label: string; description: string }> = [
  { id: "none", label: "None", description: "Listings only" },
  { id: "price", label: "Price heatmap", description: "Where listing prices concentrate" },
  { id: "ppsf", label: "Price per sq ft", description: "Listings colored by $/sqft" },
  { id: "commute", label: "Commute time", description: "Drive-time rings from a destination" },
  { id: "walk", label: "Walkability", description: "Demo walk score surface" },
  { id: "flood", label: "Flood risk", description: "Demo flood-risk surface" },
  { id: "crime", label: "Crime", description: "Demo reported-crime density" },
  { id: "noise", label: "Noise", description: "Demo ambient noise levels" },
];

export const HEAT_RAMPS: Record<"price" | "walk" | "flood" | "crime" | "noise", Array<[number, string]>> = {
  price: [
    [0, "rgba(58,55,163,0)"],
    [0.2, "#a9b4ff"],
    [0.5, "#6d6bea"],
    [0.8, "#e08a3c"],
    [1, "#c2410c"],
  ],
  walk: [
    [0, "rgba(16,185,129,0)"],
    [0.3, "#bbf7d0"],
    [0.6, "#34d399"],
    [1, "#047857"],
  ],
  flood: [
    [0, "rgba(59,130,246,0)"],
    [0.3, "#bfdbfe"],
    [0.6, "#60a5fa"],
    [1, "#1d4ed8"],
  ],
  crime: [
    [0, "rgba(244,63,94,0)"],
    [0.3, "#fecdd3"],
    [0.6, "#fb7185"],
    [1, "#be123c"],
  ],
  noise: [
    [0, "rgba(168,85,247,0)"],
    [0.3, "#e9d5ff"],
    [0.6, "#c084fc"],
    [1, "#7e22ce"],
  ],
};

export const COMMUTE_SPEEDS_MPH = { drive: 27, transit: 14, bike: 10, walk: 3 } as const;
export type CommuteMode = keyof typeof COMMUTE_SPEEDS_MPH;
export const COMMUTE_MINUTES = [15, 30, 45] as const;
