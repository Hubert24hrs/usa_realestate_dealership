import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export const metadata: Metadata = { title: "Check your email", robots: { index: false, follow: false } };

export default function CheckEmailPage() {
  const devOutbox = !process.env.RESEND_API_KEY;
  return (
    <div className="container-page grid min-h-[60dvh] place-items-center py-16 text-center">
      <div className="max-w-md">
        <MailCheck className="mx-auto size-12 text-primary" aria-hidden />
        <h1 className="mt-4 font-display text-display-md font-semibold">Check your email</h1>
        <p className="mt-2 text-muted-foreground">We sent a sign-in link. It expires in one hour and works once.</p>
        {devOutbox && (
          <p className="mt-6 rounded-xl border border-dashed p-4 text-sm">
            Email delivery isn&apos;t configured (no <code>RESEND_API_KEY</code>), so messages go to the{" "}
            <Link href="/dev/outbox" className="font-medium text-primary underline">dev outbox</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
