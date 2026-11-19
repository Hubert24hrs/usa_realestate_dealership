import type { Metadata } from "next";
import { KeyRound, Mail } from "lucide-react";
import { AccountPageHeader } from "@/components/account/page-header";
import { DataControls, NotificationPrefsForm, ProfileForm, PushDeviceCard } from "@/components/account/settings-forms";
import { CookiePreferencesButton } from "@/components/compliance/cookie-preferences-button";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Settings" };

function Card({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-3xl border bg-surface p-5 sm:p-6">
      <h2 id={`${id}-title`} className="font-display text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const session = await requireUser("/account/settings");
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { name: true, email: true, phone: true, isDemo: true, accounts: { select: { provider: true } }, notificationPrefs: true },
  });
  const prefs = user.notificationPrefs;
  const providers = new Set(user.accounts.map((a) => a.provider));
  return (
    <>
      <AccountPageHeader title="Settings" description="Profile, notifications and privacy." />
      <div className="space-y-5">
        <Card id="profile" title="Profile" description="Shared with agents and landlords only when you contact them.">
          <ProfileForm defaults={{ name: user.name ?? "", phone: user.phone ?? "" }} email={user.email} />
        </Card>

        <Card id="sign-in" title="Sign in methods">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" aria-hidden /> Email magic link: {user.email}</li>
            {providers.has("google") && <li className="flex items-center gap-2"><KeyRound className="size-4 text-muted-foreground" aria-hidden /> Google account linked</li>}
            {user.isDemo && <li className="text-muted-foreground">This is a shared guest account with one click sign in.</li>}
          </ul>
        </Card>

        <Card id="notifications" title="Notifications" description="Choose what we email you. Saved searches also have their own alert settings.">
          <NotificationPrefsForm
            initial={{
              emailListingAlerts: prefs?.emailListingAlerts ?? true,
              pushListingAlerts: prefs?.pushListingAlerts ?? false,
              emailPriceDrops: prefs?.emailPriceDrops ?? true,
              emailTourUpdates: prefs?.emailTourUpdates ?? true,
              emailMessages: prefs?.emailMessages ?? true,
              emailNewsletter: prefs?.emailNewsletter ?? false,
              alertDigest: prefs?.alertDigest ?? "DAILY",
            }}
          />
        </Card>

        <Card id="push" title="Push notifications on this device" description="Get instant alerts in your browser, even when CITI VIEW isn't open.">
          <PushDeviceCard />
        </Card>

        <Card id="privacy" title="Privacy & your data" description="Download a copy of your data or delete your account (CCPA / GDPR). We never sell your personal information.">
          <DataControls isGuest={user.isDemo} />
          <div className="mt-4 border-t pt-4 text-sm">
            <CookiePreferencesButton className="font-medium text-primary underline underline-offset-4">Manage cookie preferences</CookiePreferencesButton>
          </div>
        </Card>
      </div>
    </>
  );
}
