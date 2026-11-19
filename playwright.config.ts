import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a seeded database and a production build:
 *   NEXT_DIST_DIR=.next-prod npm run build && npm run test:e2e
 * Set E2E_BASE_URL to test a deployed environment instead of starting a local server.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Tests share one seeded database and demo accounts, so run them in order.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  // PW_CHANNEL=chrome (or msedge) runs against an installed browser instead of Playwright's bundled build.
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "node scripts/serve-prod.mjs", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
