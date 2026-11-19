import type { Metadata } from "next";
import Link from "@/components/app-link";
import { Plus } from "lucide-react";
import { AccountPageHeader } from "@/components/account/page-header";
import { AdminPager } from "@/components/admin/pager";
import { AutoSubmitForm } from "@/components/agents/filter-form";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Content" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const PER_PAGE = 30;
const TYPES: Record<string, string> = { GUIDE: "Guide", LEARN: "Learn", NEWS: "News", BLOG: "Blog" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export default async function AdminContentPage({ searchParams }: PageProps) {
  await requireRole(["ADMIN"], "/admin/content");
  const sp = await searchParams;
  const type = one(sp.type) in TYPES ? one(sp.type) : "";
  const status = ["DRAFT", "PUBLISHED"].includes(one(sp.status)) ? one(sp.status) : "";
  const page = Math.max(1, Math.min(100, Number.parseInt(one(sp.page), 10) || 1));
  const where = { ...(type ? { type: type as never } : {}), ...(status ? { status: status as never } : {}) };
  const [total, posts] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({ where, orderBy: [{ updatedAt: "desc" }], skip: (page - 1) * PER_PAGE, take: PER_PAGE, select: { id: true, title: true, slug: true, type: true, status: true, publishedAt: true, updatedAt: true, readingMinutes: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <AccountPageHeader
        eyebrow="Admin"
        title="Content"
        description="Guides, market news and learning articles. Everything is original CITI VIEW writing. Don't paste copy from other sites."
        actions={<Button asChild><Link href="/admin/content/new"><Plus className="size-4" aria-hidden /> New article</Link></Button>}
      />
      <AutoSubmitForm action="/admin/content" className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-3">
        <label className="sr-only" htmlFor="content-type">Section</label>
        <select id="content-type" name="type" defaultValue={type} className={selectCls}>
          <option value="">All sections</option>
          {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="sr-only" htmlFor="content-status">Status</label>
        <select id="content-status" name="status" defaultValue={status} className={selectCls}>
          <option value="">Drafts and published</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Drafts</option>
        </select>
        <Button type="submit" variant="outline" className="h-9">Apply</Button>
      </AutoSubmitForm>
      <div className="overflow-x-auto rounded-3xl border bg-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Articles</caption>
          <thead className="border-b text-xs text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Title</th>
              <th scope="col" className="px-4 py-3">Section</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {posts.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/content/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                  <p className="text-xs text-muted-foreground">/learn/{p.slug}{p.readingMinutes ? ` · ${p.readingMinutes} min` : ""}</p>
                </td>
                <td className="px-4 py-3">{TYPES[p.type]}</td>
                <td className="px-4 py-3">
                  {p.status === "PUBLISHED" ? (
                    <Link href={`/learn/${p.slug}`} className="text-primary hover:underline">Published {p.publishedAt ? formatDate(p.publishedAt) : ""}</Link>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Draft</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPager base="/admin/content" params={{ type, status }} page={page} pages={pages} />
    </>
  );
}
