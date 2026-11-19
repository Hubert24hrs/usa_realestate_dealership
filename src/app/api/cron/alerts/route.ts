import { runAlerts } from "@/server/alerts";
import { cronAuthorized } from "@/server/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const summary = await runAlerts();
  return Response.json({ ok: true, ...summary });
}
