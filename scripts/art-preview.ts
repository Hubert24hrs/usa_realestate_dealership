/**
 * Dev utility: renders a contact sheet of generated scenes to a PNG.
 *   npx tsx scripts/art-preview.ts <out.png> [scene,scene,…] [seedPrefix]
 */
import sharp from "sharp";
import { SCENES, renderScene, type SceneKey } from "../src/lib/media/art";

async function main() {
  const out = process.argv[2] ?? "art-preview.png";
  const list = (process.argv[3] ? process.argv[3].split(",") : Object.keys(SCENES)) as SceneKey[];
  const prefix = process.argv[4] ?? "preview";
  const tiles = await Promise.all(
    list.map(async (scene, i) => {
      const params: Record<string, string> =
        scene === "floor-plan" ? { b: "3", ba: "2.5", sf: "2100", g: "1" } : scene === "topography" ? { a: "64" } : {};
      const svg = renderScene(scene, `${prefix}-${i}`, params);
      return sharp(Buffer.from(svg)).resize(480, 320).png().toBuffer();
    }),
  );
  const cols = 4;
  const rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: cols * 480, height: rows * 320, channels: 3, background: "#ffffff" } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * 480, top: Math.floor(i / cols) * 320 })))
    .png()
    .toFile(out);
  console.log(`Wrote ${tiles.length} scenes → ${out}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
