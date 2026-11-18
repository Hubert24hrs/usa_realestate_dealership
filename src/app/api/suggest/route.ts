import { limitRequest, rateLimitHeaders, tooManyRequests } from "@/lib/security/rate-limit";
import { getSearchProvider } from "@/server/search/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limit = await limitRequest(request, "suggest", 240, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 80) ?? "";
  const provider = await getSearchProvider();
  const suggestions = await provider.suggest(q, 10);
  return Response.json({ suggestions }, { headers: { ...rateLimitHeaders(limit), "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
