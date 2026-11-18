#!/usr/bin/env node
/**
 * Copies runtime assets that bundlers can't emit automatically into public/vendor
 * (git-ignored). Runs on postinstall.
 *  - maplibre-gl v6 web worker: the ESM build loads it from a sibling URL, which
 *    Turbopack/webpack chunks don't provide; we serve it and call setWorkerUrl().
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const outDir = path.resolve("public/vendor");
fs.mkdirSync(outDir, { recursive: true });

const assets = [["maplibre-gl/dist/maplibre-gl-worker.mjs", "maplibre-gl-worker.mjs"]];
for (const [from, to] of assets) {
  try {
    const src = require.resolve(from);
    fs.copyFileSync(src, path.join(outDir, to));
    console.log(`vendor: ${from} → public/vendor/${to}`);
  } catch (error) {
    console.warn(`vendor: could not copy ${from} (${error.message})`);
  }
}
