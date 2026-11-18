import { parseFilters } from "@/lib/search/filters";
import { limitRequest, rateLimitHeaders, tooManyRequests } from "@/lib/security/rate-limit";
import { getSearchProvider } from "@/server/search/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = await limitRequest(request, "search", 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const url = new URL(request.url);
  const filters = parseFilters(url.searchParams);
  const provider = await getSearchProvider();
  try {
    const result = await provider.search(filters, { withPoints: url.searchParams.get("points") !== "0" });
    return Response.json(result, {
      headers: { ...rateLimitHeaders(limit), "Cache-Control": "private, max-age=15" },
    });
  } catch (error) {
    console.error("search failed", error);
    return Response.json({ error: "Search is temporarily unavailable." }, { status: 500 });
  }
}
