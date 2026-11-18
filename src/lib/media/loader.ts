import type { ImageLoader } from "next/image";

/**
 * CDN-ready image loading.
 * - Unsplash: served from Unsplash's imgix CDN (required by their API guidelines) with auto AVIF/WebP.
 * - Uploads / MLS feed photos: rewritten to NEXT_PUBLIC_IMAGE_CDN when configured
 *   ("cloudinary:<cloud>" or an imgix-style base URL); otherwise Next's optimizer.
 * - Pexels and everything else: Next.js optimizer (AVIF/WebP, responsive sizes).
 */
const CDN = process.env.NEXT_PUBLIC_IMAGE_CDN ?? "";

export function isSvg(src: string): boolean {
  return /\.svg(\?|$)/i.test(src) || src.startsWith("data:image/svg");
}

export const unsplashLoader: ImageLoader = ({ src, width, quality }) => {
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 72));
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "max");
  return url.toString();
};

export const cdnLoader: ImageLoader = ({ src, width, quality }) => {
  const absolute = src.startsWith("http") ? src : `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${src}`;
  if (CDN.startsWith("cloudinary:")) {
    const cloud = CDN.slice("cloudinary:".length);
    return `https://res.cloudinary.com/${cloud}/image/fetch/f_auto,q_${quality ?? "auto"},w_${width}/${encodeURIComponent(absolute)}`;
  }
  const base = CDN.replace(/\/$/, "");
  const path = src.startsWith("http") ? `/${encodeURIComponent(src)}` : src;
  return `${base}${path}?w=${width}&q=${quality ?? 72}&auto=format`;
};

export function pickLoader(src: string): ImageLoader | undefined {
  if (src.startsWith("https://images.unsplash.com")) return unsplashLoader;
  if (CDN && (src.startsWith("/uploads/") || src.includes(".blob.vercel-storage.com"))) return cdnLoader;
  return undefined;
}
