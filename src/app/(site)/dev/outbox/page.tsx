import type { Metadata } from "next";
import Link from "@/components/app-link";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";
import { assertOutboxAccess } from "@/server/outbox";

export const metadata: Metadata = { title: "Dev outbox", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Outbox for emails captured when RESEND_API_KEY is not set. Development (or admins) only — it can contain sign-in links. */
export default async function OutboxPage() {
  await assertOutboxAccess();
  const mails = await db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, to: true, subject: true, provider: true, status: true, createdAt: true } });
  return (
    <div className="container-page py-10">
      <h1 className="font-display text-display-md font-semibold">Dev outbox</h1>
      <p className="mt-1 text-sm text-muted-foreground">Emails captured locally because no email provider key is configured. Newest first.</p>
      <ul className="mt-6 divide-y rounded-2xl border">
        {mails.map((m) => (
          <li key={m.id}>
            <Link href={`/dev/outbox/${m.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 hover:bg-accent">
              <span className="min-w-0 flex-1 truncate font-medium">{m.subject}</span>
              <span className="text-sm text-muted-foreground">{m.to}</span>
              <span className="text-xs text-muted-foreground">{formatDate(m.createdAt)} {formatTime(m.createdAt)} · {m.provider}/{m.status}</span>
            </Link>
          </li>
        ))}
        {mails.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No emails yet.</li>}
      </ul>
    </div>
  );
}
