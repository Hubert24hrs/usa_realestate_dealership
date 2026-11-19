import { PexelsProvider } from "./pexels";
import { POOLS, type PoolKey } from "./pools";
import { isSuitableListingPhoto, ProviderRateLimitError, type ImageProvider, type ProviderImage } from "./types";
import { UnsplashProvider } from "./unsplash";

export interface MediaPoolFile {
  version: 1;
  generatedAt: string;
  providers: string[];
  pools: Partial<Record<PoolKey, ProviderImage[]>>;
}

export interface BuildPoolsOptions {
  existing?: MediaPoolFile | null;
  log?: (message: string) => void;
  maxPagesPerQuery?: number;
}

/**
 * SeedProvider — fills room-category pools from official stock-photo APIs
 * (Pexels and/or Unsplash, whichever keys are configured), alternating
 * providers and queries for variety, de-duplicating globally and skipping
 * photos whose descriptions mention people, pets or text.
 */
export class SeedProvider {
  readonly providers: ImageProvider[];

  constructor(providers: ImageProvider[] = [new PexelsProvider(), new UnsplashProvider()]) {
    this.providers = providers.filter((p) => p.isConfigured());
  }

  isConfigured(): boolean {
    return this.providers.length > 0;
  }

  provider(id: string): ImageProvider | undefined {
    return this.providers.find((p) => p.id === id);
  }

  async buildPools(demand: Partial<Record<PoolKey, number>>, options: BuildPoolsOptions = {}): Promise<{ file: MediaPoolFile; complete: boolean }> {
    const log = options.log ?? (() => {});
    const maxPages = options.maxPagesPerQuery ?? 3;
    const pools: MediaPoolFile["pools"] = {};
    const seen = new Set<string>();
    for (const list of Object.values(options.existing?.pools ?? {})) for (const img of list ?? []) seen.add(img.providerId);

    let complete = true;
    outer: for (const [key, target] of Object.entries(demand) as Array<[PoolKey, number]>) {
      const pool = [...(options.existing?.pools[key] ?? [])];
      const def = POOLS[key];
      if (pool.length >= target) {
        pools[key] = pool;
        continue;
      }
      log(`• ${key}: have ${pool.length}, need ${target}`);
      const perQuery = Math.ceil((target - pool.length) / def.queries.length) + 2;
      for (let page = 1; page <= maxPages && pool.length < target; page++) {
        for (const query of def.queries) {
          if (pool.length >= target) break;
          for (const provider of this.providers) {
            if (pool.length >= target || !provider.search) break;
            try {
              const results = await provider.search(def.category, query, page, provider.id === "UNSPLASH" ? 30 : 80);
              let added = 0;
              for (const img of results) {
                if (added >= perQuery || pool.length >= target) break;
                if (seen.has(img.providerId) || !isSuitableListingPhoto(img.alt)) continue;
                if (img.width < 1000 || img.width / img.height < 1.2) continue;
                seen.add(img.providerId);
                pool.push(img);
                added++;
              }
              log(`  ${provider.id} "${query}" p${page}: +${added} (${pool.length}/${target})`);
            } catch (error) {
              if (error instanceof ProviderRateLimitError) {
                log(`  ⚠ ${error.message}. Saving progress; run again later to continue.`);
                complete = false;
                pools[key] = pool;
                break outer;
              }
              log(`  ⚠ ${(error as Error).message}`);
            }
          }
        }
      }
      if (pool.length < target) complete = false;
      pools[key] = pool;
    }
    // keep pools we did not touch this run
    for (const [key, list] of Object.entries(options.existing?.pools ?? {}) as Array<[PoolKey, ProviderImage[]]>) {
      if (!pools[key]) pools[key] = list;
    }
    return {
      file: {
        version: 1,
        generatedAt: new Date().toISOString(),
        providers: this.providers.map((p) => p.id),
        pools,
      },
      complete,
    };
  }
}
