import { z } from "zod";
import { db } from "@/lib/db";
import { SearchFiltersSchema } from "@/lib/search/filters";
import { readJson } from "@/lib/security/request";
import { withUser } from "@/server/api";
import { matchingListingIds } from "@/server/alerts";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  filters: SearchFiltersSchema,
  path: z.string().max(1200).regex(/^\/[^\s]*$/),
  frequency: z.enum(["INSTANT", "DAILY", "WEEKLY", "NONE"]),
  emailEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(false),
});

export const GET = withUser(async ({ user }) => {
  const searches = await db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return Response.json({ searches });
});

export const POST = withUser(async ({ request, user }) => {
  const parsed = await readJson(request, Body, 16_000);
  if (!parsed.ok) return parsed.response;
  const count = await db.savedSearch.count({ where: { userId: user.id } });
  if (count >= 50) return Response.json({ error: "You can save up to 50 searches." }, { status: 400 });
  const { filters, ...rest } = parsed.data;
  // Baseline: current matches are "known", so the first alert only reports genuinely new listings.
  const known = await matchingListingIds({ ...filters, page: 1 });
  const search = await db.savedSearch.create({ data: { ...rest, userId: user.id, filters: { ...filters, page: 1 }, knownListingIds: known, lastCheckedAt: new Date() } });
  return Response.json({ ok: true, id: search.id });
}, { limit: 20, bucket: "saved-search" });
