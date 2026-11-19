/**
 * Downloads the generated originals listed in .cache/ai-photos/results.tsv, encodes optimized
 * WebP copies into public/media/photos/ and records them in data/ai-photos/manifest.json
 * (size, blur placeholder, dominant colour, alt text) for `photos:apply` and the seed.
 *
 *   npm run photos:process
 *
 * results.tsv format: a `base<TAB><cdn base url>` line, then `<slot><TAB><file name or full url>`.
 * Idempotent: already-processed slots are skipped; originals are cached in .cache/ai-photos/raw/.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PLAN_PATH = path.resolve("data/ai-photos/plan.json");
const RESULTS_PATH = path.resolve(".cache/ai-photos/results.tsv");
const RAW_DIR = path.resolve(".cache/ai-photos/raw");
const OUT_DIR = path.resolve("public/media/photos");
export const MANIFEST_PATH = path.resolve("data/ai-photos/manifest.json");
const QUALITY = 74;
const CONCURRENCY = 6;

interface PlanSlot {
  slot: number;
  key: string;
  category: string;
  scene: string;
  alt: string;
}
interface ManifestPhoto {
  url: string;
  width: number;
  height: number;
  blurDataUrl: string;
  color: string;
  alt: string;
  category: string;
  scene: string;
}
interface Manifest {
  version: 1;
  model: string;
  license: string;
  photos: Record<string, ManifestPhoto>;
}

function readResults(): Map<number, string> {
  if (!fs.existsSync(RESULTS_PATH)) throw new Error(`No results yet (${RESULTS_PATH})`);
  let base = "";
  const map = new Map<number, string>();
  for (const line of fs.readFileSync(RESULTS_PATH, "utf8").split(/\r?\n/)) {
    const [a, b] = line.trim().split(/\t|\s+/);
    if (!a || !b) continue;
    if (a === "base") base = b.endsWith("/") ? b : `${b}/`;
    else if (/^\d+$/.test(a)) map.set(Number(a), b.startsWith("https://") ? b : `${base}${b}`);
  }
  for (const url of map.values()) if (!url.startsWith("https://")) throw new Error(`Missing base url for ${url}`);
  return map;
}

async function download(url: string, file: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) throw new Error(`Unexpected content type ${type}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 10_000) throw new Error("File too small");
      fs.writeFileSync(file, buf);
      return;
    } catch (error) {
      if (attempt === 3) throw new Error(`Download failed for ${url}: ${(error as Error).message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

function hex(n: number) {
  return Math.round(n).toString(16).padStart(2, "0");
}

async function main() {
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, "utf8")) as { model: string; slots: PlanSlot[] };
  const bySlot = new Map(plan.slots.map((s) => [s.slot, s]));
  const results = readResults();
  const manifest: Manifest = fs.existsSync(MANIFEST_PATH)
    ? (JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Manifest)
    : { version: 1, model: plan.model, license: "AI-generated image created for CITI VIEW (Higgsfield · GPT Image 2.6). Fictional scene — not a photo of a real property.", photos: {} };
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const todo = [...results.entries()].filter(([slot]) => {
    const s = bySlot.get(slot);
    return s && !(manifest.photos[s.key] && fs.existsSync(path.join(OUT_DIR, `${s.key}.webp`)));
  });
  let done = 0;
  let failed = 0;
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const [slot, url] = item;
        const s = bySlot.get(slot)!;
        try {
          const raw = path.join(RAW_DIR, `${s.key}${path.extname(new URL(url).pathname) || ".png"}`);
          if (!fs.existsSync(raw)) await download(url, raw);
          const out = path.join(OUT_DIR, `${s.key}.webp`);
          const info = await sharp(raw).webp({ quality: QUALITY, effort: 5 }).toFile(out);
          const blur = await sharp(raw).resize(16).webp({ quality: 40 }).toBuffer();
          const { dominant } = await sharp(raw).stats();
          manifest.photos[s.key] = {
            url: `/media/photos/${s.key}.webp`,
            width: info.width,
            height: info.height,
            blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
            color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
            alt: s.alt,
            category: s.category,
            scene: s.scene,
          };
          done++;
        } catch (error) {
          failed++;
          console.error(`slot ${slot} (${s.key}): ${(error as Error).message}`);
        }
      }
    }),
  );
  const sorted = Object.fromEntries(Object.entries(manifest.photos).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ ...manifest, photos: sorted }, null, 1));
  const total = Object.keys(sorted).length;
  const bytes = fs.readdirSync(OUT_DIR).reduce((a, f) => a + fs.statSync(path.join(OUT_DIR, f)).size, 0);
  console.log(`Processed ${done} new photo(s)${failed ? `, ${failed} failed` : ""}. Manifest: ${total}/${plan.slots.length} photos, ${(bytes / 1_048_576).toFixed(1)} MB of WebP.`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
