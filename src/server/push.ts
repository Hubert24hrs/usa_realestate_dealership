import "server-only";
import { sendNotification, setVapidDetails } from "web-push";
import { db } from "@/lib/db";

let configured: boolean | null = null;

export function pushEnabled(): boolean {
  if (configured != null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(pub && priv);
  if (configured) setVapidDetails(`mailto:${process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? "alerts@citiview.example"}`, pub!, priv!);
  return configured;
}

/** Sends a Web Push notification to every subscription of a user; prunes expired subscriptions. */
export async function pushToUser(userId: string, payload: { title: string; body?: string; url?: string }) {
  if (!pushEnabled()) return 0;
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
      }
    }),
  );
  return sent;
}
