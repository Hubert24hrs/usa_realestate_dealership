import type { MediaCategoryKey } from "@/lib/domain";
import { MEDIA_CATEGORY_LABELS } from "@/lib/domain";
import { ProviderRateLimitError, tidyAlt, type ImageProvider, type ProviderImage } from "./types";

/**
 * Unsplash official API (https://unsplash.com/documentation).
 * Guidelines we follow: hotlink the returned image URLs (served via the Unsplash
 * imgix loader), trigger `download_location` when a photo is used, and attribute
 * the photographer + Unsplash with UTM-tagged links.
 */
interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  color: string | null;
  alt_description: string | null;
  description: string | null;
  urls: { raw: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
}

export class UnsplashProvider implements ImageProvider {
  readonly id = "UNSPLASH" as const;

  constructor(
    private readonly accessKey: string | undefined = process.env.UNSPLASH_ACCESS_KEY,
    private readonly appName: string = process.env.UNSPLASH_APP_NAME || "citi_view_real_estate",
  ) {}

  isConfigured(): boolean {
    return Boolean(this.accessKey);
  }

  private utm(url: string): string {
    const u = new URL(url);
    u.searchParams.set("utm_source", this.appName);
    u.searchParams.set("utm_medium", "referral");
    return u.toString();
  }

  async search(category: MediaCategoryKey, query: string, page: number, perPage = 30): Promise<ProviderImage[]> {
    if (!this.accessKey) throw new Error("UNSPLASH_ACCESS_KEY is not set");
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(Math.min(30, perPage)));
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${this.accessKey}`, "Accept-Version": "v1" },
    });
    if (res.status === 403 || res.status === 429) throw new ProviderRateLimitError("Unsplash");
    if (!res.ok) throw new Error(`Unsplash search failed (${res.status}) for "${query}"`);
    const json = (await res.json()) as { results: UnsplashPhoto[] };

    return json.results.map((photo) => {
      const maxWidth = Math.min(photo.width, 2000);
      return {
        provider: "UNSPLASH",
        providerId: `unsplash:${photo.id}`,
        category,
        url: photo.urls.raw,
        width: maxWidth,
        height: Math.round((photo.height / photo.width) * maxWidth),
        alt: tidyAlt(photo.alt_description ?? photo.description, MEDIA_CATEGORY_LABELS[category]),
        color: photo.color,
        photographer: photo.user.name,
        photographerUrl: this.utm(photo.user.links.html),
        sourceUrl: this.utm(photo.links.html),
        license: "Unsplash License",
        downloadLocation: photo.links.download_location,
      } satisfies ProviderImage;
    });
  }

  /** Required by the Unsplash API guidelines whenever a photo is used in the product. */
  async registerUse(image: ProviderImage): Promise<void> {
    if (!this.accessKey || !image.downloadLocation) return;
    await fetch(image.downloadLocation, {
      headers: { Authorization: `Client-ID ${this.accessKey}`, "Accept-Version": "v1" },
    }).catch(() => undefined);
  }

  thumbnailUrl(image: ProviderImage, width: number): string {
    const u = new URL(image.url);
    u.searchParams.set("w", String(width));
    u.searchParams.set("q", "40");
    u.searchParams.set("fm", "jpg");
    return u.toString();
  }
}
