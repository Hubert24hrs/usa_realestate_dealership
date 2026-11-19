import { expect, test } from "@playwright/test";
import { firstListingHref } from "./helpers";

const PAGES: Array<[string, RegExp]> = [
  ["/", /.+/],
  ["/homes-for-sale/austin-tx", /homes for sale in austin/i],
  ["/apartments-for-rent/denver-co", /apartments for rent in denver/i],
  ["/land-for-sale", /land for sale/i],
  ["/commercial-real-estate", /commercial real estate/i],
  ["/austin-tx", /austin, tx real estate/i],
  ["/texas", /texas real estate/i],
  ["/agents", /agent/i],
  ["/brokerages", /brokerage/i],
  ["/mortgage/calculator", /monthly payment/i],
  ["/rent", /place you.ll love/i],
  ["/rent/affordability", /rent/i],
  ["/home-value", /worth|value/i],
  ["/learn", /learn|guide/i],
  ["/learn/glossary", /glossary/i],
  ["/about", /see every home/i],
  ["/legal/privacy", /privacy policy/i],
  ["/legal/fair-housing", /fair housing/i],
];

test.describe("public pages", () => {
  for (const [path, heading] of PAGES) {
    test(`${path} renders one h1 and no server error @mobile`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(heading);
      await expect(page.locator("footer")).toContainText("Fair housing");
    });
  }

  test("unknown routes return the 404 page", async ({ page }) => {
    const res = await page.goto("/not-a-real-place-xyz");
    expect(res?.status()).toBe(404);
  });
});

test.describe("listing galleries", () => {
  test("each property has its own multi-photo gallery", async ({ page }) => {
    await page.goto("/homes-for-sale/austin-tx");
    const hrefs = [...new Set(await page.locator('main a[href^="/property/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")!)))].slice(0, 3);
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    const seen = new Map<string, string>();
    for (const href of hrefs) {
      await page.goto(href);
      const gallery = page.getByRole("region", { name: "Photo gallery" });
      await expect(gallery).toBeVisible();
      const photos = await page.getByRole("button", { name: /^Open photo \d+ of \d+/ }).first().getAttribute("aria-label");
      const total = Number(/of (\d+)/.exec(photos ?? "")?.[1] ?? 0);
      expect(total, `${href} photo count`).toBeGreaterThanOrEqual(5);
      // The mobile carousel and desktop mosaic both render, so a photo can appear twice in the DOM.
      const srcs = await gallery.locator("img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src));
      const files = new Set(srcs.map((s) => decodeURIComponent(s).match(/\/media\/[^?&]+\.(webp|jpg|png)/)?.[0]).filter(Boolean) as string[]);
      expect(files.size, `${href} distinct photos rendered`).toBeGreaterThanOrEqual(5);
      for (const f of files) {
        expect(seen.get(f), `${f} also used by ${seen.get(f)}`).toBeUndefined();
        seen.set(f, href);
      }
    }
  });

  test("listing detail shows price, facts, contact options and compliance text", async ({ page }) => {
    await page.goto(await firstListingHref(page));
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /^(Tour|Site visit)$/ }).first()).toBeVisible();
    await expect(page.getByText(/deemed reliable but (is )?not guaranteed/i).first()).toBeVisible();
  });
});

test.describe("SEO plumbing", () => {
  test("robots.txt and the sitemap index point at real sitemaps", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap:");
    expect(robots).toMatch(/Disallow: \/admin/);
    expect(robots).not.toMatch(/Disallow: \/agents\b/);

    const index = await request.get("/sitemap.xml");
    expect(index.status()).toBe(200);
    const files = [...(await index.text()).matchAll(/<loc>[^<]*\/sitemaps\/([^<]+)<\/loc>/g)].map((m) => m[1]!);
    expect(files).toEqual(expect.arrayContaining(["pages.xml", "places.xml", "listings-1.xml", "profiles.xml", "learn.xml"]));
    const places = await (await request.get("/sitemaps/places.xml")).text();
    expect(places).toContain("/homes-for-sale/austin-tx</loc>");
    expect(places).toContain("/austin-tx</loc>");
    const listings = await (await request.get("/sitemaps/listings-1.xml")).text();
    expect(listings).toMatch(/\/property\/[a-z0-9-]+<\/loc>/);
    expect((await request.get("/sitemaps/nope.xml")).status()).toBe(404);
  });

  test("filtered searches are noindex with a clean canonical", async ({ page }) => {
    await page.goto("/homes-for-sale/austin-tx?beds=3");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/homes-for-sale\/austin-tx$/);
  });

  test("place hubs publish FAQ structured data", async ({ page }) => {
    await page.goto("/austin-tx");
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = ld.map((t) => JSON.parse(t)["@type"]);
    expect(types).toEqual(expect.arrayContaining(["BreadcrumbList", "City", "FAQPage"]));
  });
});
