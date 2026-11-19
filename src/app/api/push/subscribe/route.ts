import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { withUser } from "@/server/api";

export const runtime = "nodejs";

/**
 * Only accept endpoints on the browser vendors' push services. The server later
 * POSTs to this URL, so an arbitrary endpoint would be an SSRF vector.
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/,
  /^[a-z0-9.-]+\.notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9.-]+\.push\.apple\.com$/,
];

function allowedEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

const Subscription = z.object({
  endpoint: z.string().max(2048).refine(allowedEndpoint, "Unsupported push service"),
  keys: z.object({ p256dh: z.string().min(16).max(256), auth: z.string().min(8).max(128) }),
});

export const POST = withUser(
  async ({ request, user }) => {
    const parsed = await readJson(request, Subscription, 4_000);
    if (!parsed.ok) return parsed.response;
    const { endpoint, keys } = parsed.data;
    const existing = await db.pushSubscription.findMany({ where: { userId: user.id, NOT: { endpoint } }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (existing.length >= 10) await db.pushSubscription.delete({ where: { id: existing[0]!.id } });
    await db.$transaction([
      db.pushSubscription.upsert({
        where: { endpoint },
        create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
      }),
      db.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, pushListingAlerts: true }, update: { pushListingAlerts: true } }),
    ]);
    return Response.json({ ok: true });
  },
  { limit: 10, bucket: "push" },
);

const Unsubscribe = z.object({ endpoint: z.string().max(2048) });

export const DELETE = withUser(async ({ request, user }) => {
  const parsed = await readJson(request, Unsubscribe, 4_000);
  if (!parsed.ok) return parsed.response;
  const result = await db.pushSubscription.deleteMany({ where: { userId: user.id, endpoint: parsed.data.endpoint } });
  return Response.json({ ok: true, removed: result.count });
});
