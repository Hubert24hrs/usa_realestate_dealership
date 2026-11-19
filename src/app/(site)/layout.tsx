import { ConsentBanner } from "@/components/compliance/consent-banner";
import { SiteNotice } from "@/components/compliance/site-notice";
import { SITE_NOTICE_SCRIPT } from "@/components/compliance/site-notice-script";
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
      {site.demoMode && (
        <>
          <script dangerouslySetInnerHTML={{ __html: SITE_NOTICE_SCRIPT }} />
          <SiteNotice text={settings.demoBanner} />
        </>
      )}
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      <ConsentBanner />
    </>
  );
}
