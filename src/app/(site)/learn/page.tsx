import type { Metadata } from "next";
import Link from "@/components/app-link";
import type { PostType } from "@prisma/client";
import { PostCard, POST_TYPE_LABEL } from "@/components/learn/post-card";
import { PageHero } from "@/components/tools/page-hero";
import { ToolCard } from "@/components/tools/tool-card";
import { TOOLS } from "@/lib/content/tools";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TYPES = ["GUIDE", "LEARN", "NEWS", "BLOG"] as const;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const parseType = (v: string | undefined): PostType | undefined => (TYPES as readonly string[]).includes(v ?? "") ? (v as PostType) : undefined;

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const type = parseType(first(sp.type));
  const tag = first(sp.tag);
  const label = type ? `${POST_TYPE_LABEL[type]}s` : "Guides, how-tos and market news";
  return {
    title: type ? `Real estate ${label.toLowerCase()}` : "Learn: real estate guides, how-tos and market news",
    description: "Plain-English guides to buying, selling and renting, mortgage how-tos, neighborhood guides and market updates from CITI VIEW.",
    alternates: { canonical: type ? `/learn?type=${type}` : "/learn" },
    robots: tag ? { index: false, follow: true } : undefined,
  };
}

export default async function LearnPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const type = parseType(first(sp.type));
  const tagRaw = first(sp.tag);
  const tag = tagRaw && tagRaw.length <= 40 ? tagRaw : undefined;

  const [posts, tagRows] = await Promise.all([
    db.post.findMany({
      where: { status: "PUBLISHED", ...(type ? { type } : {}), ...(tag ? { tags: { has: tag } } : {}) },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, excerpt: true, type: true, coverColor: true, readingMinutes: true, publishedAt: true, tags: true },
    }),
    db.post.findMany({ where: { status: "PUBLISHED" }, select: { tags: true } }),
  ]);
  const tags = [...new Set(tagRows.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b));
  const href = (t?: string, g?: string) => {
    const q = new URLSearchParams();
    if (t) q.set("type", t);
    if (g) q.set("tag", g);
    const s = q.toString();
    return s ? `/learn?${s}` : "/learn";
  };

  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Learn", href: "/learn" }]}
        eyebrow="Learn"
        title="Guides, how-tos and market news"
        description="Straightforward help for every step — buying, selling, renting and financing — plus neighborhood guides and market updates."
      >
        <nav aria-label="Filter articles by type" className="mt-6 flex flex-wrap gap-1.5">
          {[undefined, ...TYPES].map((t) => {
            const on = t === type;
            return (
              <Link
                key={t ?? "all"}
                href={href(t, tag)}
                aria-current={on ? "page" : undefined}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}
              >
                {t ? `${POST_TYPE_LABEL[t]}s` : "All"}
              </Link>
            );
          })}
        </nav>
      </PageHero>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="articles-title">
          <h2 id="articles-title" className="sr-only">Articles</h2>
          {tag && (
            <p className="mb-4 text-sm text-muted-foreground">
              Showing articles tagged <strong className="text-foreground">{tag}</strong> ·{" "}
              <Link href={href(type)} className="font-medium text-primary hover:underline">Clear tag</Link>
            </p>
          )}
          {posts.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {posts.map((p) => (
                <li key={p.slug}>
                  <PostCard post={p} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No articles here yet. <Link href="/learn" className="font-medium text-primary hover:underline">See everything</Link>
            </div>
          )}
        </section>

        <aside className="space-y-8" aria-label="Topics and tools">
          <section aria-labelledby="topics-title">
            <h2 id="topics-title" className="text-sm font-semibold">Topics</h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((g) => (
                <li key={g}>
                  <Link
                    href={href(type, g === tag ? undefined : g)}
                    aria-current={g === tag ? "true" : undefined}
                    className={cn("inline-block rounded-full border px-2.5 py-1 text-xs font-medium", g === tag ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent")}
                  >
                    {g}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="tools-title">
            <h2 id="tools-title" className="text-sm font-semibold">Calculators & tools</h2>
            <ul className="mt-3 space-y-2">
              {TOOLS.map((t) => (
                <li key={t.slug}>
                  <ToolCard tool={t} compact />
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
