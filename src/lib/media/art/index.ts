import type { MediaCategoryKey } from "@/lib/domain";
import { makeCtx, wrapSvg } from "./core";
import { aerial, buildingExterior, commercialExterior, houseExterior, landscape, townhomeExterior } from "./exteriors";
import {
  amenity,
  backyard,
  bathroom,
  bedroom,
  cityView,
  diningRoom,
  kitchen,
  livingRoom,
  lobby,
  office,
  retailSpace,
  warehouse,
} from "./interiors";
import { floorPlan, topography } from "./plans";

export const SCENES = {
  "exterior-house": { category: "EXTERIOR", title: "Illustrated home exterior" },
  "exterior-townhome": { category: "EXTERIOR", title: "Illustrated townhome exterior" },
  "exterior-building": { category: "EXTERIOR", title: "Illustrated residential building" },
  "exterior-commercial": { category: "EXTERIOR", title: "Illustrated commercial building" },
  "living-room": { category: "LIVING_ROOM", title: "Illustrated living room" },
  kitchen: { category: "KITCHEN", title: "Illustrated kitchen" },
  "dining-room": { category: "DINING_ROOM", title: "Illustrated dining room" },
  "primary-bedroom": { category: "PRIMARY_BEDROOM", title: "Illustrated primary bedroom" },
  bedroom: { category: "BEDROOM", title: "Illustrated bedroom" },
  bathroom: { category: "BATHROOM", title: "Illustrated bathroom" },
  backyard: { category: "BACKYARD", title: "Illustrated backyard" },
  "aerial-residential": { category: "AERIAL", title: "Illustrated aerial view" },
  "aerial-commercial": { category: "AERIAL", title: "Illustrated aerial view of commercial district" },
  "aerial-land": { category: "AERIAL", title: "Illustrated aerial view of acreage" },
  amenity: { category: "AMENITY", title: "Illustrated community amenity" },
  view: { category: "VIEW", title: "Illustrated city view" },
  office: { category: "OFFICE", title: "Illustrated office interior" },
  lobby: { category: "LOBBY", title: "Illustrated lobby" },
  warehouse: { category: "WAREHOUSE", title: "Illustrated warehouse interior" },
  "retail-space": { category: "RETAIL_SPACE", title: "Illustrated retail space" },
  land: { category: "LAND", title: "Illustrated open land" },
  water: { category: "WATER", title: "Illustrated creek and water feature" },
  forest: { category: "FOREST", title: "Illustrated timberland" },
  pasture: { category: "PASTURE", title: "Illustrated pasture" },
  structure: { category: "STRUCTURE", title: "Illustrated barn" },
  "floor-plan": { category: "FLOOR_PLAN", title: "Illustrative floor plan" },
  topography: { category: "TOPOGRAPHY", title: "Illustrative topography map" },
} as const satisfies Record<string, { category: MediaCategoryKey; title: string }>;

export type SceneKey = keyof typeof SCENES;

export function isSceneKey(value: string): value is SceneKey {
  return Object.prototype.hasOwnProperty.call(SCENES, value);
}

/** Pool keys (EXTERIOR_HOUSE) ↔ scene keys (exterior-house). */
export function sceneForPool(poolKey: string): SceneKey {
  const key = poolKey.toLowerCase().replace(/_/g, "-");
  return isSceneKey(key) ? key : "exterior-house";
}

type Params = Record<string, string | undefined>;

function num(params: Params, key: string, fallback: number, min: number, max: number): number {
  const v = Number(params[key]);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

export function renderScene(scene: SceneKey, seed: string, params: Params = {}): string {
  const ctx = makeCtx(`${scene}:${seed}`);
  let body: string;
  switch (scene) {
    case "exterior-house": body = houseExterior(ctx); break;
    case "exterior-townhome": body = townhomeExterior(ctx); break;
    case "exterior-building": body = buildingExterior(ctx, "residential"); break;
    case "exterior-commercial": body = commercialExterior(ctx, params.v ?? "office"); break;
    case "living-room": body = livingRoom(ctx); break;
    case "kitchen": body = kitchen(ctx); break;
    case "dining-room": body = diningRoom(ctx); break;
    case "primary-bedroom": body = bedroom(ctx, true); break;
    case "bedroom": body = bedroom(ctx, false); break;
    case "bathroom": body = bathroom(ctx); break;
    case "backyard": body = backyard(ctx); break;
    case "aerial-residential": body = aerial(ctx, "residential"); break;
    case "aerial-commercial": body = aerial(ctx, "commercial"); break;
    case "aerial-land": body = aerial(ctx, "land"); break;
    case "amenity": body = amenity(ctx); break;
    case "view": body = cityView(ctx); break;
    case "office": body = office(ctx); break;
    case "lobby": body = lobby(ctx); break;
    case "warehouse": body = warehouse(ctx); break;
    case "retail-space": body = retailSpace(ctx); break;
    case "land": body = landscape(ctx, "land"); break;
    case "water": body = landscape(ctx, "water"); break;
    case "forest": body = landscape(ctx, "forest"); break;
    case "pasture": body = landscape(ctx, "pasture"); break;
    case "structure": body = landscape(ctx, "structure"); break;
    case "floor-plan":
      body = floorPlan(ctx, {
        beds: num(params, "b", 3, 0, 6),
        baths: num(params, "ba", 2, 1, 5),
        sqft: num(params, "sf", 1800, 300, 400000),
        kind: params.k === "condo" ? "condo" : params.k === "commercial" ? "commercial" : "home",
        garage: params.g === "1",
      });
      break;
    case "topography": body = topography(ctx, num(params, "a", 40, 0.1, 100000)); break;
  }
  return wrapSvg(ctx, body, SCENES[scene].title);
}
