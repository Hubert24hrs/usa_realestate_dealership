import type { MediaCategoryKey } from "@/lib/domain";
import { MEDIA_CATEGORY_LABELS } from "@/lib/domain";
import type { ImageProvider, ProviderImage } from "./types";

/**
 * FeedProvider — stub for a licensed IDX / RESO Web API feed.
 *
 * Plug in real MLS photos by setting RESO_API_BASE_URL, RESO_TOKEN_URL,
 * RESO_CLIENT_ID and RESO_CLIENT_SECRET (OAuth2 client-credentials, which is
 * what most RESO Web API vendors — Bridge, Trestle, Spark, MLS Grid — use).
 * See README → "Connecting a licensed MLS / IDX feed".
 *
 * RESO Data Dictionary "Media" resource fields used:
 *   MediaKey, ResourceRecordKey, MediaURL, MediaCategory, ImageOf, Order,
 *   ShortDescription, LongDescription, ImageWidth, ImageHeight, Permission
 */
export interface ResoMedia {
  MediaKey: string;
  ResourceRecordKey: string;
  MediaURL: string;
  MediaCategory?: string | null; // "Photo" | "Floor Plan" | "Video" | "Branded Virtual Tour" | …
  ImageOf?: string | null; // "Kitchen" | "Living Room" | "Exterior (Front)" | …
  Order?: number | null;
  ShortDescription?: string | null;
  LongDescription?: string | null;
  ImageWidth?: number | null;
  ImageHeight?: number | null;
  Permission?: string[] | null; // e.g. ["IDX", "VOW"]
}

const IMAGE_OF_RULES: Array<[RegExp, MediaCategoryKey]> = [
  [/floor\s*plan/i, "FLOOR_PLAN"],
  [/aerial|drone|birds?\s*eye/i, "AERIAL"],
  [/exterior|front|facade|elevation|street/i, "EXTERIOR"],
  [/primary|master/i, "PRIMARY_BEDROOM"],
  [/bed/i, "BEDROOM"],
  [/bath|powder|shower/i, "BATHROOM"],
  [/kitchen|pantry/i, "KITCHEN"],
  [/dining|breakfast/i, "DINING_ROOM"],
  [/living|family|great\s*room|den/i, "LIVING_ROOM"],
  [/yard|patio|deck|garden|pool|porch|outdoor/i, "BACKYARD"],
  [/view/i, "VIEW"],
  [/office|study/i, "OFFICE"],
  [/lobby|common|clubhouse|amenit|gym|fitness/i, "AMENITY"],
  [/warehouse|dock|industrial/i, "WAREHOUSE"],
  [/retail|store/i, "RETAIL_SPACE"],
  [/creek|pond|lake|river|water/i, "WATER"],
  [/timber|wood|forest/i, "FOREST"],
  [/pasture|field|meadow|crop/i, "PASTURE"],
  [/barn|shed|shop|outbuilding/i, "STRUCTURE"],
  [/land|lot|acre/i, "LAND"],
];

export function categoryFromReso(media: Pick<ResoMedia, "ImageOf" | "MediaCategory" | "ShortDescription">): MediaCategoryKey {
  const haystack = [media.MediaCategory, media.ImageOf, media.ShortDescription].filter(Boolean).join(" ");
  for (const [pattern, category] of IMAGE_OF_RULES) if (pattern.test(haystack)) return category;
  return "OTHER";
}

export function mapResoMedia(media: ResoMedia): ProviderImage {
  const category = categoryFromReso(media);
  return {
    provider: "FEED",
    providerId: `feed:${media.MediaKey}`,
    category,
    url: media.MediaURL,
    width: media.ImageWidth ?? 1600,
    height: media.ImageHeight ?? 1067,
    alt: media.ShortDescription?.trim() || media.LongDescription?.trim() || MEDIA_CATEGORY_LABELS[category],
    license: "Licensed via MLS/IDX feed — display subject to the MLS's IDX rules",
  };
}

export class FeedProvider implements ImageProvider {
  readonly id = "FEED" as const;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly config = {
      baseUrl: process.env.RESO_API_BASE_URL,
      tokenUrl: process.env.RESO_TOKEN_URL,
      clientId: process.env.RESO_CLIENT_ID,
      clientSecret: process.env.RESO_CLIENT_SECRET,
    },
  ) {}

  isConfigured(): boolean {
    const { baseUrl, tokenUrl, clientId, clientSecret } = this.config;
    return Boolean(baseUrl && tokenUrl && clientId && clientSecret);
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;
    const res = await fetch(this.config.tokenUrl!, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.config.clientId!,
        client_secret: this.config.clientSecret!,
        scope: "api",
      }),
    });
    if (!res.ok) throw new Error(`RESO token request failed (${res.status})`);
    const json = (await res.json()) as { access_token: string; expires_in?: number };
    this.token = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return json.access_token;
  }

  /** Fetch every photo for one listing, ordered as the listing agent arranged them. */
  async getListingMedia(listingKey: string): Promise<ProviderImage[]> {
    if (!this.isConfigured()) {
      throw new Error("FeedProvider is not configured — set the RESO_* variables (see README).");
    }
    const url = new URL(`${this.config.baseUrl!.replace(/\/$/, "")}/Media`);
    const safeKey = listingKey.replace(/'/g, "''");
    url.searchParams.set("$filter", `ResourceName eq 'Property' and ResourceRecordKey eq '${safeKey}'`);
    url.searchParams.set("$orderby", "Order asc");
    url.searchParams.set("$top", "100");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await this.accessToken()}` } });
    if (!res.ok) throw new Error(`RESO Media request failed (${res.status})`);
    const json = (await res.json()) as { value: ResoMedia[] };
    return json.value
      .filter((m) => !m.Permission || m.Permission.includes("IDX"))
      .map(mapResoMedia);
  }
}
