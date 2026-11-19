import { withUser } from "@/server/api";
import { pushEnabled, pushToUser } from "@/server/push";

export const runtime = "nodejs";

/** Sends a test notification to every device the user has enabled. */
export const POST = withUser(
  async ({ user }) => {
    if (!pushEnabled()) return Response.json({ error: "Push isn't configured on this server (VAPID keys missing)." }, { status: 503 });
    const sent = await pushToUser(user.id, { title: "CITI VIEW test notification", body: "Push alerts are working on this device.", url: "/account/notifications" });
    return Response.json({ ok: true, sent });
  },
  { limit: 5, bucket: "push-test" },
);
