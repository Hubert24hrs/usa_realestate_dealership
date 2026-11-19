import type { Metadata } from "next";
import Link from "@/components/app-link";
import { ArrowLeft } from "lucide-react";
import { AccountPageHeader } from "@/components/account/page-header";
import { NewListingForm } from "@/components/admin/new-listing-form";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "New listing" };

export default async function AdminNewListingPage() {
  await requireRole(["ADMIN"], "/admin/listings/new");
  const cities = await db.city.findMany({ orderBy: [{ stateCode: "asc" }, { name: "asc" }], select: { slug: true, name: true, stateCode: true } });
  return (
    <>
      <Link href="/admin/listings" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> All listings</Link>
      <AccountPageHeader eyebrow="Admin" title="New listing" description="Start with the essentials. You'll add photos and the remaining facts on the next screen." />
      <NewListingForm cities={cities} />
    </>
  );
}
