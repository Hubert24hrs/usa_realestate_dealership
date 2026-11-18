import { SCENES, sceneForPool, type SceneKey } from "./art";
import type { ImageProvider, ProviderImage } from "./types";

/**
 * GeneratedProvider — CITI VIEW's own procedurally generated illustrations.
 * Always available (no API key, no third-party content). Used for floor plans,
 * topography maps, and as the fallback when no stock-photo key is configured.
 * Images are served by /media/generated/[scene]/[seed] as cacheable SVG.
 */
export class GeneratedProvider implements ImageProvider {
  readonly id = "GENERATED" as const;

  isConfigured(): boolean {
    return true;
  }

  image(scene: SceneKey, seed: string, alt: string, params: Record<string, string | number | boolean> = {}): ProviderImage {
    const safeSeed = seed.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
    const query = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, typeof v === "boolean" ? (v ? "1" : "0") : String(v)]),
    ).toString();
    return {
      provider: "GENERATED",
      providerId: `gen:${scene}:${safeSeed}`,
      category: SCENES[scene].category,
      url: `/media/generated/${scene}/${safeSeed}.svg${query ? `?${query}` : ""}`,
      width: 1600,
      height: 1067,
      alt,
      color: null,
      license: "Original CITI VIEW illustration",
    };
  }

  forPool(poolKey: string, seed: string, alt: string, params?: Record<string, string | number | boolean>): ProviderImage {
    return this.image(sceneForPool(poolKey), seed, alt, params);
  }
}

export const generatedProvider = new GeneratedProvider();
