import type { Metadata } from "next";
import Link from "@/components/app-link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { ArrowRight, FlaskConical, Mail } from "lucide-react";
import { GUEST_ACCOUNTS, googleEnabled, signIn } from "@/auth";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { site } from "@/lib/site";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { getSessionUser, safeCallback } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ callbackUrl?: string; error?: string; sent?: string }> };

async function guard(): Promise<boolean> {
  const ip = clientIp(await headers());
  return (await rateLimit(`signin:${ip}`, 10, 10 * 60_000)).ok;
}

async function emailSignIn(formData: FormData) {
  "use server";
  const callbackUrl = safeCallback(formData.get("callbackUrl"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) redirect(`/sign-in?error=InvalidEmail&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (!(await guard())) redirect(`/sign-in?error=RateLimited&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  try {
    await signIn("email", { email, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) redirect(`/sign-in?error=EmailSignin&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    throw error;
  }
}

async function guestSignIn(formData: FormData) {
  "use server";
  const callbackUrl = safeCallback(formData.get("callbackUrl"), "");
  const email = String(formData.get("email") ?? "");
  if (!(await guard())) redirect("/sign-in?error=RateLimited");
  const target = callbackUrl || (email.startsWith("agent") ? "/agent" : email.startsWith("admin") ? "/admin" : email.startsWith("renter") ? "/account/rentals" : email.startsWith("manager") ? "/agent" : "/account");
  try {
    await signIn("guest", { email, redirectTo: target });
  } catch (error) {
    if (error instanceof AuthError) redirect("/sign-in?error=CredentialsSignin");
    throw error;
  }
}

async function googleSignIn(formData: FormData) {
  "use server";
  await signIn("google", { redirectTo: safeCallback(formData.get("callbackUrl")) });
}

const ERRORS: Record<string, string> = {
  InvalidEmail: "Enter a valid email address.",
  RateLimited: "Too many sign in attempts. Please wait a few minutes.",
  EmailSignin: "We couldn't send the sign in email. Please try again.",
  CredentialsSignin: "That guest account isn't available.",
  OAuthAccountNotLinked: "This email is already linked to another sign in method. Use the method you used before.",
  Verification: "That sign in link has expired or was already used. Request a new one.",
};

export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl: rawCallback, error } = await searchParams;
  const callbackUrl = safeCallback(rawCallback);
  if (await getSessionUser()) redirect(callbackUrl);
  return (
    <div className="container-page grid min-h-[80dvh] items-center gap-10 py-12 lg:grid-cols-[1fr_1fr]">
      <div className="mx-auto w-full max-w-md">
        <LogoMark className="size-12" />
        <h1 className="mt-5 font-display text-display-md font-semibold">Sign in or create an account</h1>
        <p className="mt-2 text-muted-foreground">Save homes, get alerts, schedule tours and message agents for free.</p>
        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {ERRORS[error] ?? "Something went wrong signing you in. Please try again."}
          </p>
        )}
        <form action={emailSignIn} className="mt-6 space-y-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="h-11" />
          </div>
          <Button type="submit" size="lg" className="h-11 w-full text-base">
            <Mail className="size-4" aria-hidden /> Email me a sign in link
          </Button>
        </form>
        {googleEnabled && (
          <form action={googleSignIn} className="mt-3">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <Button type="submit" variant="outline" size="lg" className="h-11 w-full text-base">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"/></svg>
              Continue with Google
            </Button>
          </form>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          By continuing you agree to the <Link href="/legal/terms" className="underline">Terms of use</Link> and <Link href="/legal/privacy" className="underline">Privacy policy</Link>. We never sell your personal information.
        </p>
      </div>

      {site.demoMode && (
        <section aria-labelledby="guest-title" className="mx-auto w-full max-w-md rounded-3xl border bg-surface p-6">
          <h2 id="guest-title" className="flex items-center gap-2 font-semibold"><FlaskConical className="size-4 text-copper-600" aria-hidden /> Explore with a guest account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Each role comes with sample data. No password needed.</p>
          <ul className="mt-4 space-y-2">
            {GUEST_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <form action={guestSignIn}>
                  <input type="hidden" name="email" value={a.email} />
                  <input type="hidden" name="callbackUrl" value={rawCallback ? callbackUrl : ""} />
                  <button type="submit" className="group flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/50">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{a.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.description}</span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
