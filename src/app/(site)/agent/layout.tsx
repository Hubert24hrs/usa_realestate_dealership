import type { Metadata } from "next";
import { SideNav, type SideNavItem } from "@/components/layout/side-nav";
import { db } from "@/lib/db";
import { PRO_ROLES } from "@/server/api";
import { requireRole } from "@/server/auth-helpers";
import { applicationScope, getProScope, leadScope, tourScope } from "@/server/pro";

export const metadata: Metadata = { title: { template: "%s · Pro dashboard · CITI VIEW", default: "Pro dashboard" }, robots: { index: false, follow: false } };

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(PRO_ROLES, "/agent");
  const scope = await getProScope(user);
  const [newLeads, openTours, pendingApps] = await Promise.all([
    db.lead.count({ where: { ...leadScope(scope), status: "NEW" } }),
    db.tourRequest.count({ where: { ...tourScope(scope), status: "REQUESTED" } }),
    db.rentalApplication.count({ where: { ...applicationScope(scope), status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
  ]);
  const items: SideNavItem[] = [
    { href: "/agent", label: "Overview", icon: "overview", exact: true },
    { href: "/agent/leads", label: "Leads", icon: "leads", count: newLeads },
    { href: "/agent/listings", label: "Listings", icon: "listings" },
    { href: "/agent/tours", label: "Tours", icon: "tours", count: openTours },
    { href: "/agent/applications", label: "Applications", icon: "applications", count: pendingApps },
    ...(scope.agent ? [{ href: "/agent/billing", label: "Plan & billing", icon: "billing" as const }] : []),
  ];
  return (
    <div className="container-page pt-6 pb-16 lg:pt-10">
      <div className="lg:grid lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-10">
        <SideNav label="Pro dashboard" items={items} title={scope.agent?.name ?? scope.organization?.name ?? user.name ?? "Pro dashboard"} subtitle={scope.agent ? `${scope.agent.plan.charAt(0)}${scope.agent.plan.slice(1).toLowerCase()} plan` : scope.organization ? "Property management" : scope.isAdmin ? "Admin view — all listings" : undefined} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
