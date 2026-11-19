import fs from "node:fs";
import path from "node:path";
import { MEDIA_CATEGORY_LABELS } from "../../src/lib/domain";
import { generatedProvider } from "../../src/lib/media/generated";
import type { PoolKey } from "../../src/lib/media/pools";
import type { MediaPoolFile } from "../../src/lib/media/seed-provider";
import type { ProviderImage } from "../../src/lib/media/types";

export const MEDIA_POOL_PATH = path.resolve("data/media-pool.json");
export const AI_MANIFEST_PATH = path.resolve("data/ai-photos/manifest.json");

interface AiManifest {
  license: string;
  photos: Record<string, { url: string; width: number; height: number; blurDataUrl: string; color: string; alt: string; category: string; scene: string }>;
}

/** AI-generated listing photos (scripts/ai-photos), keyed by the seed's slot key `<listing key>-<k>`. */
export function loadAiPhotos(): AiManifest | null {
  if (!fs.existsSync(AI_MANIFEST_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(AI_MANIFEST_PATH, "utf8")) as AiManifest;
  } catch {
    return null;
  }
}

/** The AI photo planned for a slot, as a ProviderImage — or null to fall back to the pools. */
export function aiImage(manifest: AiManifest | null, slotKey: string): ProviderImage | null {
  const key = slotKey.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
  const p = manifest?.photos[key];
  if (!p) return null;
  return {
    provider: "AI",
    providerId: `ai:${p.scene}:${key}`,
    category: p.category as ProviderImage["category"],
    url: p.url,
    width: p.width,
    height: p.height,
    alt: p.alt,
    color: p.color,
    blurDataUrl: p.blurDataUrl,
    license: manifest!.license,
  };
}

export function loadMediaPool(): MediaPoolFile | null {
  if (!fs.existsSync(MEDIA_POOL_PATH)) return null;
  try {
    const file = JSON.parse(fs.readFileSync(MEDIA_POOL_PATH, "utf8")) as MediaPoolFile;
    return file.version === 1 ? file : null;
  } catch {
    return null;
  }
}

/**
 * Hands out images so that no photo is used twice anywhere in the dataset.
 * Falls back to an original generated illustration when a pool runs dry or
 * no stock-photo pool has been fetched yet.
 */
export class MediaAssigner {
  private readonly used = new Set<string>();
  private readonly cursors = new Map<PoolKey, number>();
  stats = { pool: 0, generated: 0 };

  constructor(private readonly pool: MediaPoolFile | null) {}

  take(poolKey: PoolKey, seed: string, context: { label: string; variant?: string }): ProviderImage {
    const list = this.pool?.pools[poolKey] ?? [];
    let cursor = this.cursors.get(poolKey) ?? 0;
    while (cursor < list.length) {
      const candidate = list[cursor++]!;
      if (this.used.has(candidate.providerId)) continue;
      this.used.add(candidate.providerId);
      this.cursors.set(poolKey, cursor);
      this.stats.pool++;
      return candidate;
    }
    this.cursors.set(poolKey, cursor);
    const params = context.variant ? { v: context.variant } : undefined;
    const fallback = generatedProvider.forPool(poolKey, seed, "", params);
    fallback.alt = `${MEDIA_CATEGORY_LABELS[fallback.category]} illustration for ${context.label}`;
    this.used.add(fallback.providerId);
    this.stats.generated++;
    return fallback;
  }
}

export function altFor(image: ProviderImage, label: string): string {
  const category = MEDIA_CATEGORY_LABELS[image.category];
  if (image.provider === "GENERATED") return image.alt || `${category} illustration for ${label}`;
  if (image.provider === "AI") return image.alt || category;
  const alt = image.alt?.trim() || category;
  return alt.toLowerCase().startsWith(category.toLowerCase()) ? alt : `${category}: ${alt}`;
}
