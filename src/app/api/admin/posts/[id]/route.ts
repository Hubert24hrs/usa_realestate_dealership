import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { PostSchema } from "@/lib/validation/admin";
import { readingMinutes, revalidateContent } from "@/server/admin";
import { ID_RE, notFound, withRole } from "@/server/api";

export const runtime = "nodejs";

export const PATCH = withRole<{ id: string }>(
  ["ADMIN"],
  async ({ request, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, PostSchema, 80_000);
    if (!body.ok) return body.response;
    const post = await db.post.findUnique({ where: { id: params.id }, select: { id: true, slug: true, publishedAt: true } });
    if (!post) return notFound();
    const p = body.data;
    if (p.slug !== post.slug && (await db.post.count({ where: { slug: p.slug } }))) return Response.json({ error: "That URL slug is already used by another article." }, { status: 409 });
    await db.post.update({
      where: { id: post.id },
      data: {
        title: p.title,
        slug: p.slug,
        type: p.type,
        status: p.status,
        excerpt: p.excerpt || null,
        body: p.body,
        tags: p.tags,
        citySlug: p.citySlug || null,
        coverColor: p.coverColor || null,
        seoTitle: p.seoTitle || null,
        seoDescription: p.seoDescription || null,
        readingMinutes: readingMinutes(p.body),
        // First publish stamps the date; later edits keep it (no fake "fresh" dates).
        publishedAt: p.status === "PUBLISHED" ? (post.publishedAt ?? new Date()) : post.publishedAt,
      },
    });
    revalidateContent(post.slug, p.slug);
    return Response.json({ ok: true, slug: p.slug });
  },
  { limit: 120, bucket: "admin" },
);

const DeleteBody = z.object({ confirm: z.literal("DELETE") });

export const DELETE = withRole<{ id: string }>(
  ["ADMIN"],
  async ({ request, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, DeleteBody, 200);
    if (!body.ok) return body.response;
    const post = await db.post.findUnique({ where: { id: params.id }, select: { id: true, slug: true } });
    if (!post) return notFound();
    await db.post.delete({ where: { id: post.id } });
    revalidateContent(post.slug);
    return Response.json({ ok: true });
  },
  { limit: 30, bucket: "admin" },
);
