#!/usr/bin/env node
/**
 * Serve a local production build (built with NEXT_DIST_DIR=.next-prod, so it can sit next to
 * `next dev`'s .next folder). Used for realistic performance / Lighthouse checks on localhost.
 *
 *   NEXT_DIST_DIR=.next-prod npm run build
 *   node scripts/serve-prod.mjs            # http://localhost:3000 (PORT to change)
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = process.env.NEXT_DIST_DIR || ".next-prod";
if (!existsSync(join(root, distDir, "BUILD_ID"))) {
  console.error(`No production build in ${distDir}. Run: NEXT_DIST_DIR=${distDir} npm run build`);
  process.exit(1);
}
const next = join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [next, "start", "-p", process.env.PORT || "3000"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NEXT_DIST_DIR: distDir },
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
