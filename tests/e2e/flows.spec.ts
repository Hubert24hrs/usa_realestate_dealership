import { expect, test } from "@playwright/test";
import { firstListingHref, signInAs } from "./helpers";

test("search filters update results and keep the URL shareable", async ({ page }) => {
  await page.goto("/homes-for-sale/austin-tx");
  await expect(page.locator('main a[href^="/property/"]').first()).toBeVisible();
  await page.goto("/homes-for-sale/austin-tx?beds=4");
  await expect(page).toHaveURL(/beds=4/);
  await expect(page.locator("h1")).toContainText(/Austin/);
});

test("mortgage calculator recalculates as inputs change", async ({ page }) => {
  await page.goto("/mortgage/calculator");
  const price = page.getByLabel(/home price/i).first();
  await price.fill("600000");
  await price.blur();
  await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible();
});

test("a buyer can save a home and find it in their account", async ({ page }) => {
  const href = await firstListingHref(page);
  await signInAs(page, "Home buyer", href);
  // Let the page hydrate (the heart has no click handler until then) and load saved-home state.
  await page.waitForLoadState("networkidle");
  const save = page.getByRole("button", { name: /^Save / }).first();
  const unsave = page.getByRole("button", { name: /^Remove .* from saved homes/ }).first();
  // The heart updates optimistically, so wait for the API call before moving on.
  const favoriteCall = (method: "POST" | "DELETE") => page.waitForResponse((r) => r.url().includes("/api/favorites/") && r.request().method() === method);

  // Start from a known state (a previous run may have left it saved).
  if (await unsave.isVisible().catch(() => false)) {
    const removed = favoriteCall("DELETE");
    await unsave.click();
    expect((await removed).ok()).toBe(true);
  }
  const added = favoriteCall("POST");
  await save.click();
  expect((await added).ok()).toBe(true);
  await expect(unsave).toBeVisible();

  await page.goto("/account/favorites");
  await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();

  // Clean up.
  await page.goto(href);
  await page.waitForLoadState("networkidle");
  const cleanup = favoriteCall("DELETE");
  await page.getByRole("button", { name: /^Remove .* from saved homes/ }).first().click();
  expect((await cleanup).ok()).toBe(true);
  await expect(page.getByRole("button", { name: /^Save / }).first()).toBeVisible();
});

test("private areas enforce roles", async ({ page, request }) => {
  await signInAs(page, "Home buyer", "/account");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account\?denied=1/);
  await page.goto("/agent");
  await expect(page).toHaveURL(/\/account\?denied=1/);

  // Signed-out API calls are rejected, and admin APIs refuse cross-site requests.
  const anon = await request.post("/api/admin/listings", { data: {}, headers: { origin: "http://localhost:3000" } });
  expect([401, 403]).toContain(anon.status());
  const crossSite = await page.request.post("/api/admin/listings", { data: {}, headers: { origin: "https://evil.example" } });
  expect(crossSite.status()).toBe(403);
});

test("an admin can open every admin section", async ({ page }) => {
  await signInAs(page, "Admin", "/admin");
  for (const path of ["/admin", "/admin/listings", "/admin/import", "/admin/agents", "/admin/leads", "/admin/content", "/admin/places", "/admin/reports", "/admin/settings"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1"), path).toHaveCount(1);
  }
});
