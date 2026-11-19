import type { Metadata } from "next";
import { SideNav, type SideNavItem } from "@/components/layout/side-nav";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: { template: "%s · Admin · CITI VIEW", default: "Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["ADMIN"], "/admin");
  const [openReports, unassigned, drafts] = await Promise.all([
    db.report.count({ where: { status: "OPEN" } }),
    db.lead.count({ where: { agentId: null, status: "NEW", OR: [{ listingId: null }, { listing: { isFsbo: false } }] } }),
    db.listing.count({ where: { status: "DRAFT" } }),
  ]);
  const items: SideNavItem[] = [
    { href: "/admin", label: "Overview", icon: "overview", exact: true },
    { href: "/admin/listings", label: "Listings", icon: "listings", count: drafts },
    { href: "/admin/import", label: "CSV import", icon: "import" },
    { href: "/admin/agents", label: "Agents", icon: "agents" },
    { href: "/admin/leads", label: "Leads", icon: "leads", count: unassigned },
    { href: "/admin/content", label: "Content", icon: "content" },
    { href: "/admin/places", label: "Places", icon: "places" },
    { href: "/admin/reports", label: "Reports", icon: "reports", count: openReports },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ];
  return (
    <div className="container-page pt-6 pb-16 lg:pt-10">
      <div className="lg:grid lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-10">
        <SideNav label="Admin" items={items} title="CITI VIEW admin" subtitle={user.email ?? undefined} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
