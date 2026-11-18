/**
 * Fetches the seed photo pools from the official Pexels / Unsplash APIs.
 *   1. computes how many photos each room pool needs (from the seed specs)
 *   2. searches the configured providers, de-duplicating globally
 *   3. computes tiny blur placeholders (sharp)
 *   4. writes data/media-pool.json (URLs + attribution only — no image files)
 * Re-runnable: existing pool entries are kept, so a rate-limited run can resume.
 *   npm run media:fetch   then   npm run db:seed
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { buildListingSpecs } from "../prisma/seed/listings";
import { MEDIA_POOL_PATH, loadMediaPool } from "../prisma/seed/media";
import { mediaPlan, type PoolKey } from "../src/lib/media/pools";
import { SeedProvider } from "../src/lib/media/seed-provider";
import type { ProviderImage } from "../src/lib/media/types";
import { Rng } from "../src/lib/random";

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++]!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const seed = new SeedProvider();
  if (!seed.isConfigured()) {
    console.error("No stock-photo API key found. Add PEXELS_API_KEY (and/or UNSPLASH_ACCESS_KEY) to .env.local, then re-run.");
    process.exit(1);
  }
  console.log(`Providers: ${seed.providers.map((p) => p.id).join(", ")}`);

  const demand: Partial<Record<PoolKey, number>> = {};
  for (const spec of buildListingSpecs()) {
    for (const key of mediaPlan({ category: spec.category, propertyType: spec.propertyType, isCommunity: spec.community }, new Rng(`${spec.key}:media`))) {
      demand[key] = (demand[key] ?? 0) + 1;
    }
  }
  for (const key of Object.keys(demand) as PoolKey[]) demand[key] = Math.ceil(demand[key]! * 1.2) + 3;
  console.log("Demand per pool:", demand);

  const existing = loadMediaPool();
  const { file, complete } = await seed.buildPools(demand, { existing, log: (m) => console.log(m) });

  const needBlur: ProviderImage[] = [];
  for (const list of Object.values(file.pools)) for (const img of list ?? []) if (!img.blurDataUrl) needBlur.push(img);
  console.log(`Computing ${needBlur.length} blur placeholders …`);
  let done = 0;
  await mapLimit(needBlur, 8, async (img) => {
    const provider = seed.provider(img.provider);
    const url = provider?.thumbnailUrl?.(img, 32);
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const buffer = Buffer.from(await res.arrayBuffer());
      const tiny = await sharp(buffer).resize(16).webp({ quality: 45 }).toBuffer();
      img.blurDataUrl = `data:image/webp;base64,${tiny.toString("base64")}`;
    } catch {
      /* keep going; the colour placeholder still works */
    }
    if (++done % 100 === 0) console.log(`  ${done}/${needBlur.length}`);
  });

  fs.mkdirSync(path.dirname(MEDIA_POOL_PATH), { recursive: true });
  fs.writeFileSync(MEDIA_POOL_PATH, `${JSON.stringify(file, null, 1)}\n`);
  const total = Object.values(file.pools).reduce((a, l) => a + (l?.length ?? 0), 0);
  console.log(`\nWrote ${total} photos to ${path.relative(process.cwd(), MEDIA_POOL_PATH)}.`);
  if (!complete) console.log("⚠ Some pools are short (rate limit or few results). Re-run later to top them up; missing slots fall back to generated illustrations.");
  console.log("Next: npm run db:seed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
