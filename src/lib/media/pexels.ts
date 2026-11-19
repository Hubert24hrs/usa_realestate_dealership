import type { MediaCategoryKey } from "@/lib/domain";
import { MEDIA_CATEGORY_LABELS } from "@/lib/domain";
import { ProviderRateLimitError, tidyAlt, type ImageProvider, type ProviderImage } from "./types";

/**
 * Pexels official API (https://www.pexels.com/api/documentation/).
 * Free for commercial use; we store photographer attribution with every photo
 * and credit Pexels in the gallery. 200 requests/hour, 20k/month by default.
 */
interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  avg_color: string | null;
  alt: string | null;
  src: { original: string; tiny: string; large2x: string };
}

const MAX_SOURCE_WIDTH = 2000;

export class PexelsProvider implements ImageProvider {
  readonly id = "PEXELS" as const;

  constructor(private readonly apiKey: string | undefined = process.env.PEXELS_API_KEY) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async search(category: MediaCategoryKey, query: string, page: number, perPage = 80): Promise<ProviderImage[]> {
    if (!this.apiKey) throw new Error("PEXELS_API_KEY is not set");
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(Math.min(80, perPage)));
    url.searchParams.set("orientation", "landscape");

    const res = await fetch(url, { headers: { Authorization: this.apiKey } });
    if (res.status === 429) throw new ProviderRateLimitError("Pexels");
    if (!res.ok) throw new Error(`Pexels search failed (${res.status}) for "${query}"`);
    const json = (await res.json()) as { photos: PexelsPhoto[] };

    return json.photos.map((photo) => {
      const scale = photo.width > MAX_SOURCE_WIDTH ? MAX_SOURCE_WIDTH / photo.width : 1;
      return {
        provider: "PEXELS",
        providerId: `pexels:${photo.id}`,
        category,
        url: `${photo.src.original}?auto=compress&cs=tinysrgb&w=${MAX_SOURCE_WIDTH}`,
        width: Math.round(photo.width * scale),
        height: Math.round(photo.height * scale),
        alt: tidyAlt(photo.alt, MEDIA_CATEGORY_LABELS[category]),
        color: photo.avg_color,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        sourceUrl: photo.url,
        license: "Pexels License (free to use, attribution appreciated)",
      } satisfies ProviderImage;
    });
  }

  thumbnailUrl(image: ProviderImage, width: number): string {
    const base = image.url.split("?")[0];
    return `${base}?auto=compress&cs=tinysrgb&w=${width}`;
  }
}
