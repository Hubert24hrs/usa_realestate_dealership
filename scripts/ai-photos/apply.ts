/**
 * Swaps placeholder illustrations for the processed AI photos in the current database
 * (no reseed needed). Matches rows by the stable slot key in providerId:
 *   gen:<scene>:<key>  →  ai:<scene>:<key>
 *
 *   npm run photos:apply
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const MANIFEST_PATH = path.resolve("data/ai-photos/manifest.json");

interface Manifest {
  license: string;
  photos: Record<string, { url: string; width: number; height: number; blurDataUrl: string; color: string; alt: string; scene: string }>;
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) throw new Error("Run `npm run photos:process` first.");
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  const entries = Object.entries(manifest.photos);
  let updated = 0;
  for (let i = 0; i < entries.length; i += 100) {
    const chunk = entries.slice(i, i + 100);
    const results = await db.$transaction(
      chunk.map(([key, p]) =>
        db.listingMedia.updateMany({
          where: { providerId: { in: [`gen:${p.scene}:${key}`, `ai:${p.scene}:${key}`] } },
          data: {
            url: p.url,
            width: p.width,
            height: p.height,
            alt: p.alt,
            blurDataUrl: p.blurDataUrl,
            color: p.color,
            provider: "AI",
            providerId: `ai:${p.scene}:${key}`,
            license: manifest.license,
            photographer: null,
            photographerUrl: null,
            sourceUrl: null,
            downloadLocation: null,
          },
        }),
      ),
    );
    updated += results.reduce((a, r) => a + r.count, 0);
  }
  const remaining = await db.listingMedia.count({ where: { provider: "GENERATED", category: { notIn: ["FLOOR_PLAN", "TOPOGRAPHY"] } } });
  console.log(`Applied ${updated} AI photo(s). Placeholder photo slots remaining: ${remaining}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
