import type { MediaCategoryKey, MediaProviderKey } from "@/lib/domain";

export interface GalleryItem {
  id: string;
  url: string;
  alt: string;
  category: MediaCategoryKey;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  color: string | null;
  provider: MediaProviderKey;
  photographer: string | null;
  photographerUrl: string | null;
  sourceUrl: string | null;
}

export interface GalleryExtras {
  tourUrl: string | null;
  videoUrl: string | null;
  title: string;
}

export function creditLine(item: GalleryItem): { text: string; href?: string; via?: string; viaHref?: string } {
  switch (item.provider) {
    case "PEXELS":
      return { text: item.photographer ? `Photo by ${item.photographer}` : "Photo", href: item.photographerUrl ?? undefined, via: "Pexels", viaHref: item.sourceUrl ?? "https://www.pexels.com" };
    case "UNSPLASH":
      return { text: item.photographer ? `Photo by ${item.photographer}` : "Photo", href: item.photographerUrl ?? undefined, via: "Unsplash", viaHref: item.sourceUrl ?? "https://unsplash.com/?utm_source=citi_view_real_estate&utm_medium=referral" };
    case "FEED":
      return { text: "Listing photo provided by the MLS" };
    case "UPLOAD":
      return { text: "Photo provided by the lister" };
    case "AI":
      return { text: "AI generated image" };
    default:
      return { text: "Original illustration · CITI VIEW" };
  }
}

/** Matterport / YouTube / Vimeo / mp4 → embeddable URL; demo placeholders return null. */
export function embedUrl(url: string | null, kind: "tour" | "video"): { type: "iframe" | "video"; src: string } | null {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const u = new URL(url);
    if (kind === "tour" && /(^|\.)matterport\.com$/.test(u.hostname)) {
      const m = u.searchParams.get("m");
      return m ? { type: "iframe", src: `https://my.matterport.com/show/?m=${encodeURIComponent(m)}&play=1` } : null;
    }
    if (/(^|\.)youtube\.com$/.test(u.hostname) || u.hostname === "youtu.be") {
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
      return id ? { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` } : null;
    }
    if (/(^|\.)vimeo\.com$/.test(u.hostname)) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? { type: "iframe", src: `https://player.vimeo.com/video/${encodeURIComponent(id)}` } : null;
    }
    if (kind === "video" && /\.(mp4|webm)$/i.test(u.pathname)) return { type: "video", src: url };
  } catch {
    return null;
  }
  return null;
}
