import { revalidateTag } from "next/cache";
import { cronAuthorized } from "@/server/cron";
import { feedConfigured, syncResoFeed } from "@/server/feeds/reso-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Incremental MLS/IDX sync (records modified since the last run). Add ?full=1 for a full refresh. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!feedConfigured()) return Response.json({ ok: true, skipped: "RESO feed not configured" });
  const full = new URL(request.url).searchParams.get("full") === "1";
  const summary = await syncResoFeed({ full });
  if (summary.created || summary.updated || summary.offMarket) revalidateTag("listings");
  return Response.json({ ok: true, ...summary, skipped: summary.skipped.slice(0, 50), skippedCount: summary.skipped.length });
}
