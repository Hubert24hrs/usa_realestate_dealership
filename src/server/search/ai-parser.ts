import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { LAND_ACTIVITIES, LAND_TYPES, PROPERTY_TYPES, SEARCH_MODES, type SearchMode } from "@/lib/domain";
import type { SearchFilters } from "@/lib/search/filters";

/**
 * Optional Claude-powered natural-language → filter extraction.
 * Runs only when ANTHROPIC_API_KEY is set; the rule-based parser always runs
 * first and remains the fallback on any error, refusal or timeout.
 */
const MODEL = process.env.ANTHROPIC_SEARCH_MODEL || "claude-opus-5-5";

const FEATURES = [
  "pool",
  "yard",
  "waterfront",
  "view",
  "basement",
  "singleStory",
  "openHouse",
  "foreclosure",
  "fsbo",
  "tour3d",
  "video",
  "priceReduced",
  "luxury",
  "parking",
  "newConstruction",
  "water",
] as const;

const AiResultSchema = z.object({
  mode: z.enum(SEARCH_MODES),
  place: z.string().nullable(),
  priceMin: z.number().nullable(),
  priceMax: z.number().nullable(),
  bedsMin: z.number().nullable(),
  bathsMin: z.number().nullable(),
  homeTypes: z.array(z.enum(PROPERTY_TYPES)),
  sqftMin: z.number().nullable(),
  sqftMax: z.number().nullable(),
  acresMin: z.number().nullable(),
  acresMax: z.number().nullable(),
  yearBuiltMin: z.number().nullable(),
  yearBuiltMax: z.number().nullable(),
  hoaMax: z.number().nullable(),
  garageMin: z.number().nullable(),
  pets: z.enum(["any", "cats", "dogs"]).nullable(),
  schoolRatingMin: z.number().nullable(),
  daysOnMarketMax: z.number().nullable(),
  soldWithinDays: z.number().nullable(),
  capRateMin: z.number().nullable(),
  transaction: z.enum(["sale", "lease"]).nullable(),
  features: z.array(z.enum(FEATURES)),
  landTypes: z.array(z.enum(LAND_TYPES)),
  activities: z.array(z.enum(LAND_ACTIVITIES)),
  keywords: z.string().nullable(),
  ignoredFairHousingRequest: z.boolean(),
});

export type AiResult = z.infer<typeof AiResultSchema>;

const nullable = (type: string) => ({ type: [type, "null"] });
const enumArray = (values: readonly string[]) => ({ type: "array", items: { type: "string", enum: [...values] } });

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(AiResultSchema.shape),
  properties: {
    mode: { type: "string", enum: [...SEARCH_MODES] },
    place: nullable("string"),
    priceMin: nullable("number"),
    priceMax: nullable("number"),
    bedsMin: nullable("number"),
    bathsMin: nullable("number"),
    homeTypes: enumArray(PROPERTY_TYPES),
    sqftMin: nullable("number"),
    sqftMax: nullable("number"),
    acresMin: nullable("number"),
    acresMax: nullable("number"),
    yearBuiltMin: nullable("number"),
    yearBuiltMax: nullable("number"),
    hoaMax: nullable("number"),
    garageMin: nullable("number"),
    pets: { type: ["string", "null"], enum: ["any", "cats", "dogs", null] },
    schoolRatingMin: nullable("number"),
    daysOnMarketMax: nullable("number"),
    soldWithinDays: nullable("number"),
    capRateMin: nullable("number"),
    transaction: { type: ["string", "null"], enum: ["sale", "lease", null] },
    features: enumArray(FEATURES),
    landTypes: enumArray(LAND_TYPES),
    activities: enumArray(LAND_ACTIVITIES),
    keywords: nullable("string"),
    ignoredFairHousingRequest: { type: "boolean" },
  },
} as const;

const SYSTEM = `You convert a person's plain-English home search into structured filters for a US real estate marketplace.

Rules:
- Only fill a field the person stated or clearly implied; otherwise use null (or an empty array).
- mode: buy (default), rent, new (new construction), sold, commercial (office/retail/industrial/investment), land (acreage, ranches, farms, lots).
- Prices are US dollars. For rent, prices are monthly. "600k" = 600000. "around X" = X±10%.
- place: the location exactly as written (city, neighborhood, ZIP or state), or null.
- schoolRatingMin: "good schools" = 7, "great/top/best schools" = 8, an explicit rating otherwise. Ratings are 1–10.
- keywords: short property-feature words that no other field captures (e.g. "fireplace", "chef's kitchen"); null if none.
- Fair Housing: never encode preferences about race, color, religion, sex, sexual orientation, gender identity, national origin, familial status (children), disability, or similar protected characteristics, and never infer them. If the request includes any such preference, drop it and set ignoredFairHousingRequest to true. Accessibility features of the home itself (e.g. single-story, step-free entry) are allowed.`;

let client: Anthropic | null = null;

export function aiSearchEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function aiParse(query: string, defaultMode: SearchMode): Promise<AiResult | null> {
  if (!aiSearchEnabled()) return null;
  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.create(
      {
        model: MODEL,
        max_tokens: 8000,
        // Server-side refusal fallback: routes a policy decline to a fallback model in the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // Simple extraction: low effort keeps latency and cost down.
        output_config: { effort: "low", format: { type: "json_schema", schema: JSON_SCHEMA } },
        system: SYSTEM,
        messages: [{ role: "user", content: `Default mode if unspecified: ${defaultMode}\n\nSearch request: ${query}` }],
      },
      { timeout: 20_000, maxRetries: 1 },
    );
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
    if (!text) return null;
    const parsed = AiResultSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) console.warn("AI search rate limited; using rule-based parser");
    else if (error instanceof Anthropic.APIError) console.warn(`AI search API error ${error.status}; using rule-based parser`);
    else console.warn("AI search failed; using rule-based parser", error);
    return null;
  }
}

/** Convert the AI result into SearchFilters fields (only the ones it set). */
export function aiToFilters(ai: AiResult): { mode: SearchMode; filters: Partial<SearchFilters>; placeQuery?: string } {
  const f: Partial<SearchFilters> = {};
  const range = (min: number | null, max: number | null) => (min == null && max == null ? undefined : { ...(min != null ? { min } : {}), ...(max != null ? { max } : {}) });
  const price = range(ai.priceMin, ai.priceMax);
  if (price) f.price = price;
  if (ai.bedsMin != null) f.bedsMin = Math.round(ai.bedsMin);
  if (ai.bathsMin != null) f.bathsMin = ai.bathsMin;
  if (ai.homeTypes.length) f.homeTypes = ai.homeTypes;
  const sqft = range(ai.sqftMin, ai.sqftMax);
  if (sqft) f.sqft = sqft;
  const acres = range(ai.acresMin, ai.acresMax);
  if (acres) {
    if (ai.mode === "land") f.acres = acres;
    else f.lotSqft = { ...(acres.min != null ? { min: Math.round(acres.min * 43560) } : {}), ...(acres.max != null ? { max: Math.round(acres.max * 43560) } : {}) };
  }
  const year = range(ai.yearBuiltMin, ai.yearBuiltMax);
  if (year) f.yearBuilt = year;
  if (ai.hoaMax != null) f.hoaMax = ai.hoaMax;
  if (ai.garageMin != null) f.garageMin = Math.round(ai.garageMin);
  if (ai.pets) f.pets = ai.pets;
  if (ai.schoolRatingMin != null) f.schoolRatingMin = Math.min(10, Math.max(1, Math.round(ai.schoolRatingMin)));
  if (ai.daysOnMarketMax != null) f.daysOnMarketMax = Math.round(ai.daysOnMarketMax);
  if (ai.soldWithinDays != null) f.soldWithinDays = Math.round(ai.soldWithinDays);
  if (ai.capRateMin != null) f.capRateMin = ai.capRateMin;
  if (ai.transaction) f.transaction = ai.transaction;
  for (const feature of ai.features) (f as Record<string, unknown>)[feature] = true;
  if (ai.landTypes.length) f.landTypes = ai.landTypes;
  if (ai.activities.length) f.activities = ai.activities;
  if (ai.keywords) f.keywords = ai.keywords;
  return { mode: ai.mode, filters: f, placeQuery: ai.place ?? undefined };
}
