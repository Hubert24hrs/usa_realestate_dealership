import { db } from "@/lib/db";
import { limitRequest, tooManyRequests } from "@/lib/security/rate-limit";
import { cardSelect, toCardData } from "@/server/search/card";

export const runtime = "nodejs";

/** Lightweight card payload (map popups, compare tray). Accepts ?id= or ?ids=a,b,c (max 12). */
export async function GET(request: Request) {
  const limit = await limitRequest(request, "card", 240, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? url.searchParams.get("id") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9]{10,40}$/i.test(s))
    .slice(0, 12);
  if (!ids.length) return Response.json({ error: "id required" }, { status: 400 });
  const rows = await db.listing.findMany({ where: { id: { in: ids }, status: { not: "DRAFT" } }, select: cardSelect() });
  const listings = ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean).map((r) => toCardData(r!));
  if (url.searchParams.get("id")) {
    if (!listings[0]) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ listing: listings[0] }, { headers: { "Cache-Control": "public, max-age=60" } });
  }
  return Response.json({ listings }, { headers: { "Cache-Control": "public, max-age=60" } });
}
