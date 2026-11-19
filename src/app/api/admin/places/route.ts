import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { PlaceUpdateSchema } from "@/lib/validation/admin";
import { notFound, withRole } from "@/server/api";

export const runtime = "nodejs";

/** Edit city / neighborhood copy and SEO fields used by the market and search pages. */
export const PATCH = withRole(
  ["ADMIN"],
  async ({ request }) => {
    const body = await readJson(request, PlaceUpdateSchema, 16_000);
    if (!body.ok) return body.response;
    const p = body.data;
    const blank = (v: string | undefined) => (v === undefined ? undefined : v || null);
    if (p.kind === "city") {
      if (!(await db.city.count({ where: { id: p.id } }))) return notFound();
      await db.city.update({
        where: { id: p.id },
        data: { description: blank(p.description), seoTitle: blank(p.seoTitle), seoDescription: blank(p.seoDescription), heroColor: blank(p.heroColor) },
      });
    } else {
      if (!(await db.neighborhood.count({ where: { id: p.id } }))) return notFound();
      await db.neighborhood.update({
        where: { id: p.id },
        data: { description: blank(p.description), seoTitle: blank(p.seoTitle), seoDescription: blank(p.seoDescription), ...(p.highlights ? { highlights: p.highlights } : {}) },
      });
    }
    revalidateTag("markets");
    revalidateTag("listings");
    return Response.json({ ok: true });
  },
  { limit: 120, bucket: "admin" },
);
