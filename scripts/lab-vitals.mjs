/**
 * Lighthouse-style mobile lab metrics without Lighthouse: 4x CPU throttling, slow-4G network and a
 * mobile viewport via Playwright + CDP, scored with Lighthouse's log-normal curves (Speed Index is
 * not measured, so its weight is left out). Useful where Lighthouse can't record a trace (for
 * example with very new Chrome builds). Needs a running server on :3000 and Google Chrome.
 *
 *   node scripts/lab-vitals.mjs / /homes-for-sale/austin-tx /austin-tx
 */
import { chromium } from "@playwright/test";
const erfc = (x) => { // Abramowitz-Stegun
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
};
const erfcinv02 = 0.9061938024368232; // erfcinv(0.2)
const lognormal = (median, p10, v) => { if (v <= 0) return 1; const sigma = (Math.log(median) - Math.log(p10)) / (Math.SQRT2 * erfcinv02); return Math.min(1, Math.max(0, 0.5 * erfc((Math.log(v) - Math.log(median)) / (Math.SQRT2 * sigma)))); };
const CURVES = { fcp: [3000, 1800, 10], lcp: [4000, 2500, 25], tbt: [600, 200, 30], cls: [0.25, 0.1, 25] };
const urls = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome" });
for (const path of urls) {
  const runs = [];
  for (let i = 0; i < 2; i++) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (Linux; Android 11; moto g power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36" });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      const w = window; w.__v = { lcp: 0, cls: 0, long: [] };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__v.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) w.__v.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__v.long.push([e.startTime, e.duration]); }).observe({ type: "longtask", buffered: true });
    });
    await page.goto(`http://localhost:3000${path}`, { waitUntil: "load", timeout: 120_000 });
    await page.waitForTimeout(6000);
    const m = await page.evaluate(() => { const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0; const v = window.__v; const tbt = v.long.filter(([s]) => s >= fcp).reduce((a, [, d]) => a + Math.max(0, d - 50), 0); return { fcp, lcp: v.lcp, cls: v.cls, tbt }; });
    runs.push(m);
    await ctx.close();
  }
  const med = (k) => runs.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(runs.length / 2)];
  const m = { fcp: med("fcp"), lcp: med("lcp"), tbt: med("tbt"), cls: med("cls") };
  let wsum = 0, score = 0;
  for (const [k, [median, p10, w]] of Object.entries(CURVES)) { score += lognormal(median, p10, m[k]) * w; wsum += w; }
  console.log(`${path.padEnd(48)} est. perf ${Math.round((score / wsum) * 100)}  FCP ${(m.fcp / 1000).toFixed(2)}s  LCP ${(m.lcp / 1000).toFixed(2)}s  TBT ${Math.round(m.tbt)}ms  CLS ${m.cls.toFixed(3)}`);
}
await browser.close();
