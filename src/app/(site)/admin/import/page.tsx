import type { Metadata } from "next";
import { AccountPageHeader } from "@/components/account/page-header";
import { CsvImport } from "@/components/admin/csv-import";
import { IMPORT_COLUMNS } from "@/lib/validation/admin";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "CSV import" };

export default async function AdminImportPage() {
  await requireRole(["ADMIN"], "/admin/import");
  return (
    <>
      <AccountPageHeader
        eyebrow="Admin"
        title="Bulk import listings"
        description="Upload a spreadsheet of listings you're licensed to publish. Each row becomes a draft: add photos and review it before publishing. For a live MLS/IDX feed, use the feed connector described in the README instead."
      />
      <CsvImport />
      <details className="mt-8 rounded-2xl border p-4 text-sm">
        <summary className="cursor-pointer font-medium">Column reference</summary>
        <p className="mt-2 text-muted-foreground">
          Required: street_address, city, state, zip, price, description. The city must already be a CITI VIEW market. category is RESIDENTIAL, RENTAL, COMMERCIAL or LAND;
          transaction_type is SALE, RENT or LEASE; property_type uses the names in the template (for example SINGLE_FAMILY, CONDO, TOWNHOUSE).
        </p>
        <p className="mt-2 font-mono text-xs break-words">{IMPORT_COLUMNS.join(", ")}</p>
      </details>
    </>
  );
}
