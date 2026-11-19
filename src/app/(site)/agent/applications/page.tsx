import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { AccountPageHeader, EmptyState } from "@/components/account/page-header";
import { ApplicationControls } from "@/components/pro/controls";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PRO_ROLES } from "@/server/api";
import { requireRole } from "@/server/auth-helpers";
import { applicationScope, getProScope } from "@/server/pro";

export const metadata: Metadata = { title: "Applications" };

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200",
  UNDER_REVIEW: "bg-warning/20 text-warning-foreground dark:text-warning",
  APPROVED: "bg-success/15 text-success",
  DENIED: "bg-destructive/10 text-destructive",
  WITHDRAWN: "bg-muted text-muted-foreground",
};

export default async function AgentApplicationsPage() {
  const user = await requireRole(PRO_ROLES, "/agent/applications");
  const scope = await getProScope(user);
  const apps = await db.rentalApplication.findMany({
    where: { ...applicationScope(scope), status: { not: "DRAFT" } },
    orderBy: [{ submittedAt: "desc" }],
    take: 100,
    include: { listing: { select: { slug: true, communityName: true, streetAddress: true, city: true, price: true } }, unit: { select: { unitNumber: true, rent: true } }, lease: { select: { id: true, status: true } } },
  });
  const order = (s: string) => (s === "SUBMITTED" ? 0 : s === "UNDER_REVIEW" ? 1 : 2);
  apps.sort((a, b) => order(a.status) - order(b.status));

  return (
    <>
      <AccountPageHeader title="Rental applications" description="Review applicants consistently and in line with fair housing law; approving sends the lease for e-signature." />
      {apps.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No applications yet">Applications for rentals you manage will appear here.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {apps.map((a) => {
            const ap = (a.applicant ?? {}) as { firstName?: string; lastName?: string; email?: string; phone?: string; currentAddress?: string; monthsAtAddress?: number };
            const emp = (a.employment ?? {}) as { status?: string; employer?: string; monthlyIncome?: number; otherIncome?: number };
            const rent = a.unit?.rent ?? a.listing.price;
            const income = (Number(emp.monthlyIncome) || 0) + (Number(emp.otherIncome) || 0);
            const ratio = rent > 0 && income > 0 ? income / rent : null;
            return (
              <li key={a.id} className="grid gap-4 rounded-3xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{[ap.firstName, ap.lastName].filter(Boolean).join(" ") || "Applicant"}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[a.status])}>{a.status.replace("_", " ").toLowerCase()}</span>
                  </div>
                  <p className="text-muted-foreground">
                    <Link href={`/property/${a.listing.slug}`} className="hover:underline">{a.listing.communityName ?? a.listing.streetAddress}</Link>
                    {a.unit ? ` · Unit ${a.unit.unitNumber}` : ""} · {formatMoney(rent)}/mo · submitted {a.submittedAt ? formatDate(a.submittedAt) : "—"}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                    <div><dt className="text-xs text-muted-foreground">Move-in</dt><dd>{a.moveInDate ? formatDate(a.moveInDate) : "—"} · {a.leaseTermMonths ?? "—"} mo</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Income</dt><dd>{income ? `${formatMoney(income)}/mo` : "—"}{ratio ? ` (${ratio.toFixed(1)}× rent)` : ""}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Employment</dt><dd className="truncate">{[emp.status, emp.employer].filter(Boolean).join(" · ") || "—"}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Household</dt><dd>{a.occupants} occupant{a.occupants === 1 ? "" : "s"}{a.hasPets ? " · pets" : ""}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Current address</dt><dd className="truncate">{ap.currentAddress ?? "—"}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Fee</dt><dd>{a.feeAmount ? `${formatMoney(a.feeAmount)} ${a.feePaid ? "paid" : "unpaid"}` : "None"}</dd></div>
                  </dl>
                  {a.hasPets && a.petDetails && <p className="mt-1 text-xs text-muted-foreground">Pets: {a.petDetails}</p>}
                  {a.decisionNote && <p className="mt-1 text-xs text-muted-foreground">Note: {a.decisionNote}</p>}
                </div>
                <div className="space-y-2 text-sm">
                  {ap.email && <a href={`mailto:${ap.email}`} className="block truncate text-primary hover:underline">{ap.email}</a>}
                  <ApplicationControls id={a.id} status={a.status} />
                  {a.lease && <p className="text-xs text-muted-foreground">Lease {a.lease.status === "ACTIVE" ? "signed" : "awaiting signature"}.</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
