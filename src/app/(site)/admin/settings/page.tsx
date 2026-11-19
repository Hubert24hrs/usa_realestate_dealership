import type { Metadata } from "next";
import { AccountPageHeader } from "@/components/account/page-header";
import { BrokerageSetting, RoutingSetting, StateNotices, TextSetting } from "@/components/admin/settings-forms";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth-helpers";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Settings" };

function Card({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-3xl border bg-card p-5">
      <h2 id={id} className="font-semibold">{title}</h2>
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      {children}
    </section>
  );
}

export default async function AdminSettingsPage() {
  await requireRole(["ADMIN"], "/admin/settings");
  // Saves call revalidateTag(SETTINGS_TAG), so the cached settings are fresh after every change.
  const [settings, states] = await Promise.all([getSettings(), db.state.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true, notice: true } })]);
  return (
    <>
      <AccountPageHeader eyebrow="Admin" title="Settings" description="Compliance text appears in the site footer and on every listing. Have your broker of record and counsel review changes; this is not legal advice." />
      <div className="space-y-6">
        <Card id="brokerage" title="Brokerage of record" description="Shown in the footer of every page, as most state license laws require.">
          <BrokerageSetting value={settings.brokerage} />
        </Card>
        <Card id="disclaimers" title="Listing disclaimers">
          <div className="space-y-6">
            <TextSetting settingKey="compliance.idxDisclaimer" label="IDX disclaimer" help="Shown on MLS/IDX listings. Use the exact wording your MLS requires." value={settings.idxDisclaimer} />
            <TextSetting settingKey="compliance.listingDisclaimer" label="General listing disclaimer" value={settings.listingDisclaimer} rows={2} />
            <TextSetting settingKey="compliance.fairHousing" label="Fair Housing statement" help="Shown in the footer next to the Equal Housing Opportunity logo." value={settings.fairHousing} />
          </div>
        </Card>
        <Card id="state-notices" title="State notices" description="State specific consumer notices (for example Texas IABS or the New York Standardized Operating Procedures).">
          <StateNotices states={states} />
        </Card>
        <Card id="routing" title="Lead routing" description="How inquiries reach agents. FSBO inquiries always go straight to the owner.">
          <RoutingSetting value={settings.leadRouting} />
        </Card>
        <Card id="notice" title="Site notice" description="Shown sitewide while the site runs on sample data. Set NEXT_PUBLIC_SAMPLE_DATA=false to turn it off in production.">
          <TextSetting settingKey="site.demoBanner" label="Banner text" value={settings.demoBanner} rows={2} />
        </Card>
      </div>
    </>
  );
}
