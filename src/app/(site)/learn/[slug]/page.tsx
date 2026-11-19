import { cache } from "react";
import type { Metadata } from "next";
import Link from "@/components/app-link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PostCard, PostCover, POST_TYPE_LABEL } from "@/components/learn/post-card";
import { breadcrumbJsonLd, Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ToolCard } from "@/components/tools/tool-card";
import { toolsFor } from "@/lib/content/tools";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { markdownToText, renderMarkdown } from "@/lib/markdown";
import { site } from "@/lib/site";

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

const getPost = cache(async (slug: string) =>
  /^[a-z0-9-]{1,120}$/.test(slug) ? db.post.findFirst({ where: { slug, status: "PUBLISHED" } }) : null,
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const description = post.seoDescription ?? post.excerpt ?? markdownToText(post.body);
  return {
    title: post.seoTitle ?? post.title,
    description,
    alternates: { canonical: `/learn/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `${site.url}/learn/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: post.tags,
    },
  };
}

export default async function LearnPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const { html, toc } = renderMarkdown(post.body);
  const [related, city] = await Promise.all([
    db.post.findMany({
      where: { status: "PUBLISHED", slug: { not: post.slug }, ...(post.tags.length ? { tags: { hasSome: post.tags } } : {}) },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { slug: true, title: true, excerpt: true, type: true, coverColor: true, readingMinutes: true, publishedAt: true },
    }),
    post.citySlug ? db.city.findUnique({ where: { slug: post.citySlug }, select: { name: true, stateCode: true, slug: true } }) : null,
  ]);
  const tools = toolsFor(post.tags);
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Learn", href: "/learn" },
    { name: post.title, href: `/learn/${post.slug}` },
  ];
  const articleLd = {
    "@context": "https://schema.org",
    "@type": post.type === "NEWS" ? "NewsArticle" : "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Organization", name: post.authorName ?? site.name },
    publisher: { "@type": "Organization", name: site.legalName, logo: { "@type": "ImageObject", url: `${site.url}/icon.svg` } },
    mainEntityOfPage: `${site.url}/learn/${post.slug}`,
    keywords: post.tags.join(", "),
  };

  return (
    <article>
      <JsonLd data={[articleLd, breadcrumbJsonLd(crumbs)]} />
      <header className="border-b bg-surface">
        <div className="container-page grid gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <Breadcrumbs items={crumbs} className="mb-4" />
            <p className="flex flex-wrap items-center gap-2 text-xs">
              <Link href={`/learn?type=${post.type}`} className="eyebrow hover:underline">{POST_TYPE_LABEL[post.type]}</Link>
              {post.tags.map((t) => (
                <Link key={t} href={`/learn?tag=${encodeURIComponent(t)}`} className="rounded-full border bg-card px-2 py-0.5 font-medium text-muted-foreground hover:text-foreground">
                  {t}
                </Link>
              ))}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{post.title}</h1>
            {post.excerpt && <p className="mt-3 max-w-2xl text-base text-pretty text-muted-foreground">{post.excerpt}</p>}
            <p className="mt-4 text-sm text-muted-foreground">
              {post.authorName ?? site.name}
              {post.publishedAt && <> · <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time></>}
              {post.readingMinutes ? ` · ${post.readingMinutes} min read` : ""}
            </p>
          </div>
          <PostCover type={post.type} color={post.coverColor} className="relative hidden h-36 overflow-hidden rounded-2xl lg:block" />
        </div>
      </header>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 max-w-3xl">
          <div className="prose-cv" dangerouslySetInnerHTML={{ __html: html }} />
          {city && (
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-surface p-5">
              <div>
                <p className="font-semibold">Thinking about {city.name}?</p>
                <p className="text-sm text-muted-foreground">See every home for sale and rent, with schools and commute times.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/homes-for-sale/${city.slug}`} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Homes for sale <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href={`/apartments-for-rent/${city.slug}`} className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-accent">
                  Rentals
                </Link>
              </div>
            </div>
          )}
          <p className="mt-10 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
            Educational content only, not legal, tax or financial advice. Rules vary by state and change over time; confirm details with a licensed professional.
            {site.demoMode ? " Statistics and examples on this site are illustrative." : ""}
          </p>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start" aria-label="Article tools">
          {toc.length > 1 && (
            <nav aria-labelledby="toc-title">
              <h2 id="toc-title" className="text-sm font-semibold">On this page</h2>
              <ol className="mt-3 space-y-2 border-l text-sm">
                {toc.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-3 text-muted-foreground hover:border-primary hover:text-foreground">{h.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <section aria-labelledby="post-tools-title">
            <h2 id="post-tools-title" className="text-sm font-semibold">Related tools</h2>
            <ul className="mt-3 space-y-2">
              {tools.map((t) => (
                <li key={t.slug}>
                  <ToolCard tool={t} compact />
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="border-t bg-surface">
          <div className="container-page py-10">
            <h2 id="related-title" className="font-display text-2xl font-semibold tracking-tight">Keep reading</h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <PostCard post={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
