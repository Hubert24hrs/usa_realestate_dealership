import "server-only";
import { randomBytes } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { approxLocation } from "./fsbo";

/** Shared admin helpers. */
export const readingMinutes = (markdown: string) => Math.max(1, Math.round(markdown.split(/\s+/).filter(Boolean).length / 220));

export async function listingSlug(street: string, unit: string | null | undefined, city: string, state: string, zip: string) {
  for (let i = 0; i < 5; i++) {
    const slug = `${slugify(`${street}${unit ? ` unit ${unit}` : ""} ${city} ${state} ${zip}`)}-${randomBytes(2).toString("hex")}`;
    if (!(await db.listing.count({ where: { slug } }))) return slug;
  }
  throw new Error("Could not allocate a slug");
}

export function placeFor(city: { lat: number; lng: number }, seed: string) {
  return approxLocation(seed, city.lat, city.lng);
}

export function revalidateListings(slug?: string) {
  revalidateTag("listings");
  if (slug) revalidatePath(`/property/${slug}`);
}

export function revalidateContent(...slugs: string[]) {
  revalidatePath("/learn");
  revalidatePath("/mortgage");
  for (const s of slugs) revalidatePath(`/learn/${s}`);
  revalidateTag("listings"); // home page "News & learn" rail lives in the home data cache
}
