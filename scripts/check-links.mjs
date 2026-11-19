#!/usr/bin/env node
/**
 * Crawl internal links from the home page and report any that don't return 200.
 *
 *   node scripts/check-links.mjs [baseUrl=http://localhost:3000] [maxPages=400]
 *
 * Follows same-origin <a href> links breadth-first (skipping /api, auth and per-user pages),
 * so it catches broken nav/footer links and dead programmatic SEO routes before release.
 */
const base = new URL(process.argv[2] || "http://localhost:3000");
const maxPages = Number(process.argv[3] || 400);
const SKIP = [/^\/api\//, /^\/sign-in/, /^\/account/, /^\/admin/, /^\/agent(\/|$)/, /^\/collections\//, /^\/pay\//, /^\/dev\//, /^\/media\//, /^\/_next\//];

const seen = new Map(); // path -> status
const from = new Map(); // path -> first page that linked it
const queue = ["/"];
let crawled = 0;

function normalize(href, page) {
  try {
    const url = new URL(href, new URL(page, base));
    if (url.origin !== base.origin) return null;
    if (SKIP.some((re) => re.test(url.pathname))) return null;
    // Crawl each listing/search page once; query-string variants are filters, not new pages.
    return url.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
}

while (queue.length && crawled < maxPages) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  let status = 0;
  let html = "";
  try {
    const res = await fetch(new URL(path, base), { redirect: "follow", headers: { "user-agent": "citiview-link-check" } });
    status = res.status;
    if (res.ok && (res.headers.get("content-type") || "").includes("text/html")) html = await res.text();
  } catch (error) {
    status = `ERR ${error.message}`;
  }
  seen.set(path, status);
  crawled++;
  for (const m of html.matchAll(/<a\b[^>]*\shref="([^"#]+)/g)) {
    const next = normalize(m[1].replace(/&amp;/g, "&"), path);
    if (next && !seen.has(next) && !queue.includes(next)) {
      // Don't crawl every listing: sample them (they share one template).
      if (next.startsWith("/property/") && [...seen.keys()].filter((p) => p.startsWith("/property/")).length > 25) continue;
      if (!from.has(next)) from.set(next, path);
      queue.push(next);
    }
  }
}

const bad = [...seen].filter(([, s]) => s !== 200);
console.log(`Crawled ${crawled} pages (${queue.length} left in queue).`);
if (bad.length) {
  console.log(`\n${bad.length} broken:`);
  for (const [p, s] of bad) console.log(`  ${s}  ${p}   (linked from ${from.get(p) ?? "start"})`);
  process.exitCode = 1;
} else {
  console.log("No broken internal links.");
}
