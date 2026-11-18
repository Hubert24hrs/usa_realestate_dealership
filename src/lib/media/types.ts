import type { MediaCategoryKey, MediaProviderKey } from "@/lib/domain";

/** A single image as returned by any provider, normalised to our ListingMedia shape. */
export interface ProviderImage {
  provider: MediaProviderKey;
  /** Globally unique id, e.g. "pexels:12345", "unsplash:AbC", "gen:kitchen:seed". */
  providerId: string;
  category: MediaCategoryKey;
  url: string;
  width: number;
  height: number;
  alt: string;
  color?: string | null;
  blurDataUrl?: string | null;
  photographer?: string | null;
  photographerUrl?: string | null;
  sourceUrl?: string | null;
  license: string;
  /** Unsplash only: endpoint that must be pinged when the photo is used. */
  downloadLocation?: string | null;
}

/**
 * The ImageProvider abstraction. Seed providers (Pexels/Unsplash) search a
 * stock library by category; the feed provider pulls the licensed photos that
 * belong to a specific MLS listing.
 */
export interface ImageProvider {
  readonly id: MediaProviderKey;
  isConfigured(): boolean;
  /** Search the library for a category (seed providers). */
  search?(category: MediaCategoryKey, query: string, page: number, perPage: number): Promise<ProviderImage[]>;
  /** All media for one listing (feed providers). */
  getListingMedia?(listingKey: string): Promise<ProviderImage[]>;
  /** Called once when an image is attached to a listing (e.g. Unsplash download tracking). */
  registerUse?(image: ProviderImage): Promise<void>;
  /** Tiny URL used to compute a blur placeholder. */
  thumbnailUrl?(image: ProviderImage, width: number): string;
}

export class ProviderRateLimitError extends Error {
  constructor(provider: string, public readonly retryAfterSeconds?: number) {
    super(`${provider} rate limit reached`);
    this.name = "ProviderRateLimitError";
  }
}

/** Words in a stock photo's description that make it unsuitable as a listing photo. */
const UNSUITABLE = /\b(woman|women|man|men|person|people|girl|boy|child|children|kid|kids|baby|couple|family|portrait|selfie|hands?|holding|smiling|posing|model|wedding|dog|cat|puppy|kitten|text|logo|sign that says)\b/i;

export function isSuitableListingPhoto(alt: string | null | undefined): boolean {
  if (!alt) return true;
  return !UNSUITABLE.test(alt);
}

export function tidyAlt(alt: string | null | undefined, fallback: string): string {
  const text = (alt ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return sentence.length > 180 ? `${sentence.slice(0, 177)}…` : sentence;
}
