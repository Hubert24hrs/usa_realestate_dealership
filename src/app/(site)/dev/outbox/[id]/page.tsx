import Link from "@/components/app-link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";
import { assertOutboxAccess } from "@/server/outbox";

export const dynamic = "force-dynamic";

export default async function OutboxMessage({ params }: { params: Promise<{ id: string }> }) {
  await assertOutboxAccess();
  const { id } = await params;
  const mail = await db.emailLog.findUnique({ where: { id } });
  if (!mail) notFound();
  return (
    <div className="container-page py-8">
      <Link href="/dev/outbox" className="text-sm text-primary hover:underline">← Outbox</Link>
      <h1 className="mt-3 text-xl font-semibold">{mail.subject}</h1>
      <p className="text-sm text-muted-foreground">To {mail.to} · {formatDate(mail.createdAt)} {formatTime(mail.createdAt)}</p>
      {/* Sandboxed: no scripts, no same-origin access; links open in a new tab. */}
      <iframe title="Email preview" srcDoc={mail.html.replace("<head>", '<head><base target="_blank">')} sandbox="allow-popups allow-popups-to-escape-sandbox" className="mt-4 h-[70vh] w-full rounded-2xl border bg-white" />
    </div>
  );
}
