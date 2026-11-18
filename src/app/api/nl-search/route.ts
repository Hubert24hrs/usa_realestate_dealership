import { z } from "zod";
import { SEARCH_MODES } from "@/lib/domain";
import { describeFilters } from "@/lib/search/describe";
import { SearchFiltersSchema, type SearchFilters } from "@/lib/search/filters";
import { parseNaturalLanguage } from "@/lib/search/nl-parser";
import { buildSearchHref } from "@/lib/search/verticals";
import { limitRequest, tooManyRequests } from "@/lib/security/rate-limit";
import { forbidden, isSameOrigin, readJson } from "@/lib/security/request";
import { aiParse, aiToFilters } from "@/server/search/ai-parser";
import { suggestFromDb } from "@/server/search/postgres";

export const runtime = "nodejs";

const Body = z.object({ query: z.string().trim().min(2).max(300), mode: z.enum(SEARCH_MODES).optional() });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const limit = await limitRequest(request, "nl-search", 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const body = await readJson(request, Body, 4_000);
  if (!body.ok) return body.response;
  const { query, mode: requestedMode = "buy" } = body.data;

  const rules = parseNaturalLanguage(query, requestedMode);
  const ai = await aiParse(query, requestedMode);
  const fromAi = ai ? aiToFilters(ai) : null;

  // AI fills in / overrides what it understood; rules cover everything else.
  const mode = fromAi?.mode ?? rules.mode;
  const merged: Partial<SearchFilters> = { ...rules.filters, ...(fromAi?.filters ?? {}) };
  const notices = [...rules.notices];
  if (ai?.ignoredFairHousingRequest && !notices.some((n) => n.includes("Fair Housing"))) {
    notices.push("We don't filter by characteristics protected under the Fair Housing Act, so part of your request was ignored.");
  }

  let placeLabel: string | undefined;
  const placeQuery = fromAi?.placeQuery ?? rules.placeQuery;
  if (placeQuery) {
    const suggestions = await suggestFromDb(placeQuery, 6);
    const match = suggestions.find((s) => s.place);
    if (match?.place) {
      merged.place = match.place;
      placeLabel = match.type === "neighborhood" ? `${match.label}, ${match.sublabel?.split("· ")[1] ?? ""}`.trim() : match.label;
    } else {
      merged.q = placeQuery;
      placeLabel = placeQuery;
    }
  }

  const parsed = SearchFiltersSchema.safeParse({ ...merged, mode });
  const filters = parsed.success ? parsed.data : SearchFiltersSchema.parse({ mode, place: merged.place, q: merged.q });
  const chips = describeFilters(filters, mode).map((c) => c.label);
  if (placeLabel) chips.unshift(placeLabel);
  if (mode !== requestedMode) chips.unshift({ buy: "For sale", rent: "For rent", new: "New construction", sold: "Sold", commercial: "Commercial", land: "Land" }[mode]);

  return Response.json({
    href: buildSearchHref(filters),
    mode,
    chips,
    notices,
    engine: ai ? "ai+rules" : "rules",
  });
}
