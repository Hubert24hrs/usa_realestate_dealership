import { ConsentBanner } from "@/components/compliance/consent-banner";
import { DemoBanner } from "@/components/compliance/demo-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { site } from "@/lib/site";
import { getSettings } from "@/server/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <a href="#main" className="sr-only z-[60] rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to main content
      </a>
      {site.demoMode && <DemoBanner text={settings.demoBanner} />}
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      <ConsentBanner />
    </>
  );
}
