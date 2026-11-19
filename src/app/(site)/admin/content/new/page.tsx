import type { Metadata } from "next";
import Link from "@/components/app-link";
import { ArrowLeft } from "lucide-react";
import { AccountPageHeader } from "@/components/account/page-header";
import { PostEditor } from "@/components/admin/post-editor";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "New article" };

export default async function AdminNewPostPage() {
  await requireRole(["ADMIN"], "/admin/content/new");
  const cities = await db.city.findMany({ orderBy: [{ stateCode: "asc" }, { name: "asc" }], select: { slug: true, name: true, stateCode: true } });
  return (
    <>
      <Link href="/admin/content" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> All content</Link>
      <AccountPageHeader eyebrow="Admin" title="New article" />
      <PostEditor
        cities={cities}
        initial={{ title: "", slug: "", type: "GUIDE", status: "DRAFT", excerpt: "", body: "", tags: [], citySlug: "", coverColor: "#3b3fa8", seoTitle: "", seoDescription: "" }}
      />
    </>
  );
}
