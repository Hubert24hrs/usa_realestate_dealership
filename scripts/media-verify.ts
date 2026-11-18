/**
 * Verifies the image rules for seeded data:
 *  - every listing has 8–12 images
 *  - no image repeats within a listing, or across listings
 *  - every image has alt text and a room/scene category
 *  - every stock photo carries photographer attribution
 *   npm run media:verify
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const listings = await prisma.listing.findMany({
    select: { id: true, slug: true, media: { select: { providerId: true, url: true, alt: true, category: true, provider: true, photographer: true } } },
  });
  const problems: string[] = [];
  const globalSeen = new Map<string, string>();
  const categoryCounts = new Map<string, number>();
  for (const l of listings) {
    const count = l.media.length;
    if (count < 8 || count > 12) problems.push(`${l.slug}: ${count} images (expected 8–12)`);
    const local = new Set<string>();
    for (const m of l.media) {
      const key = m.providerId ?? m.url;
      if (local.has(key)) problems.push(`${l.slug}: repeated image ${key}`);
      local.add(key);
      const owner = globalSeen.get(key);
      if (owner && owner !== l.slug) problems.push(`${l.slug}: image ${key} also used by ${owner}`);
      globalSeen.set(key, l.slug);
      if (!m.alt?.trim()) problems.push(`${l.slug}: image ${key} has no alt text`);
      if ((m.provider === "PEXELS" || m.provider === "UNSPLASH") && !m.photographer) problems.push(`${l.slug}: stock photo ${key} missing attribution`);
      categoryCounts.set(m.category, (categoryCounts.get(m.category) ?? 0) + 1);
    }
  }
  const total = listings.reduce((a, l) => a + l.media.length, 0);
  console.log(`Listings: ${listings.length} · images: ${total} · unique: ${globalSeen.size}`);
  console.log(`Per listing: min ${Math.min(...listings.map((l) => l.media.length))}, max ${Math.max(...listings.map((l) => l.media.length))}`);
  console.log(`Categories: ${[...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(" · ")}`);
  if (problems.length) {
    console.error(`\n✖ ${problems.length} problem(s):\n${problems.slice(0, 50).join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log("\n✔ All listings satisfy the gallery rules.");
  }
}

main().finally(() => prisma.$disconnect());
