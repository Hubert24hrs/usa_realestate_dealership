import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AccountPageHeader } from "@/components/account/page-header";
import { DeleteButton } from "@/components/admin/controls";
import { PostEditor } from "@/components/admin/post-editor";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Edit article" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminEditPostPage({ params }: PageProps) {
  const { id } = await params;
  await requireRole(["ADMIN"], `/admin/content/${id}`);
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const [post, cities] = await Promise.all([
    db.post.findUnique({ where: { id } }),
    db.city.findMany({ orderBy: [{ stateCode: "asc" }, { name: "asc" }], select: { slug: true, name: true, stateCode: true } }),
  ]);
  if (!post) notFound();
  return (
    <>
      <Link href="/admin/content" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> All content</Link>
      <AccountPageHeader
        eyebrow={post.status === "PUBLISHED" ? `Published ${post.publishedAt ? formatDate(post.publishedAt) : ""}` : "Draft"}
        title={post.title}
        description={post.authorName ? `By ${post.authorName} · last edited ${formatDate(post.updatedAt)}` : undefined}
        actions={
          <>
            {post.status === "PUBLISHED" && <Button asChild variant="outline" size="sm"><Link href={`/learn/${post.slug}`} target="_blank">View <ExternalLink className="size-3.5" aria-hidden /><span className="sr-only">(opens in a new tab)</span></Link></Button>}
            <DeleteButton url={`/api/admin/posts/${post.id}`} what="this article" redirectTo="/admin/content" />
          </>
        }
      />
      <PostEditor
        id={post.id}
        cities={cities}
        initial={{
          title: post.title,
          slug: post.slug,
          type: post.type,
          status: post.status,
          excerpt: post.excerpt ?? "",
          body: post.body,
          tags: post.tags,
          citySlug: post.citySlug ?? "",
          coverColor: post.coverColor ?? "",
          seoTitle: post.seoTitle ?? "",
          seoDescription: post.seoDescription ?? "",
        }}
      />
    </>
  );
}
