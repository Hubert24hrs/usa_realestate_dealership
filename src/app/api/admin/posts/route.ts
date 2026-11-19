import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { PostSchema } from "@/lib/validation/admin";
import { readingMinutes, revalidateContent } from "@/server/admin";
import { withRole } from "@/server/api";

export const runtime = "nodejs";

export const POST = withRole(
  ["ADMIN"],
  async ({ request, user }) => {
    const body = await readJson(request, PostSchema, 80_000);
    if (!body.ok) return body.response;
    const p = body.data;
    if (await db.post.count({ where: { slug: p.slug } })) return Response.json({ error: "That URL slug is already used by another article." }, { status: 409 });
    const post = await db.post.create({
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
        authorName: user.name ?? "CITI VIEW Editorial",
        readingMinutes: readingMinutes(p.body),
        publishedAt: p.status === "PUBLISHED" ? new Date() : null,
      },
      select: { id: true, slug: true },
    });
    if (p.status === "PUBLISHED") revalidateContent(post.slug);
    return Response.json(post, { status: 201 });
  },
  { limit: 30, bucket: "admin" },
);
