import { expect, type Page } from "@playwright/test";

export type GuestRole = "Home buyer" | "Renter" | "FSBO seller" | "Agent" | "Property manager" | "Admin";

/** One click guest sign in (sample data mode only). */
export async function signInAs(page: Page, role: GuestRole, callbackUrl = "/account") {
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByRole("button", { name: new RegExp(`^${role}`) }).click();
  await page.waitForURL((url) => url.pathname.startsWith(callbackUrl.split("?")[0]!), { timeout: 30_000 });
}

/** First listing link on a search results page. */
export async function firstListingHref(page: Page, searchPath = "/homes-for-sale/austin-tx") {
  await page.goto(searchPath);
  const link = page.locator('main a[href^="/property/"]').first();
  await expect(link).toBeVisible();
  return (await link.getAttribute("href"))!;
}
