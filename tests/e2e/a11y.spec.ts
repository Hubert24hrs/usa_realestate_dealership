import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { firstListingHref } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(TAGS)
    // Map canvases are decorative duplicates of the results list (see /legal/accessibility).
    .exclude(".maplibregl-canvas")
    .analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

const PAGES = ["/", "/homes-for-sale/austin-tx", "/austin-tx", "/rent", "/agents", "/mortgage/calculator", "/rent/affordability", "/home-value", "/learn", "/legal/privacy", "/sign-in", "/about"];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`axe (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    for (const path of PAGES) {
      test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        expect(await scan(page)).toEqual([]);
      });
    }

    test("a listing detail page has no WCAG 2.2 AA violations", async ({ page }) => {
      await page.goto(await firstListingHref(page));
      await page.waitForLoadState("networkidle");
      expect(await scan(page)).toEqual([]);
    });
  });
}
