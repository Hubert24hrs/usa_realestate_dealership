import { z } from "zod";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";
import { readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";
import { emailLayout, sendEmail } from "@/server/email";

export const runtime = "nodejs";

const Body = z.object({ action: z.enum(["cancel", "confirm", "complete"]) });

const STATUS = { cancel: "CANCELLED", confirm: "CONFIRMED", complete: "COMPLETED" } as const;

/** Buyers cancel their own tours; the assigned agent can confirm, complete or cancel them. */
export const PATCH = withUser<{ id: string }>(async ({ request, user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const parsed = await readJson(request, Body, 1_000);
  if (!parsed.ok) return parsed.response;
  const tour = await db.tourRequest.findUnique({
    where: { id: params.id },
    include: {
      agent: { select: { userId: true, name: true, email: true } },
      listing: { select: { slug: true, streetAddress: true } },
      user: { select: { email: true, notificationPrefs: { select: { emailTourUpdates: true } } } },
    },
  });
  if (!tour) return notFound();
  const isBuyer = tour.userId === user.id;
  const isAgent = tour.agent?.userId === user.id || user.role === "ADMIN";
  const { action } = parsed.data;
  if (!(isBuyer || isAgent) || (action !== "cancel" && !isAgent)) return notFound();
  if (tour.status === "CANCELLED" || tour.status === "COMPLETED") return Response.json({ error: "This tour is already closed." }, { status: 409 });

  const status = STATUS[action];
  await db.tourRequest.update({ where: { id: tour.id }, data: { status, ...(action === "confirm" ? { confirmedAt: new Date() } : {}) } });

  const title = `Tour ${status.toLowerCase()}: ${tour.listing.streetAddress}`;
  const when = `${formatDate(tour.preferredDate)} · ${tour.preferredTime}`;
  if (isBuyer && !isAgent) {
    // Tell the agent the buyer cancelled.
    if (tour.agent?.userId) await db.notification.create({ data: { userId: tour.agent.userId, type: "TOUR_UPDATE", title, body: when, url: "/agent" } });
    if (tour.agent?.email) await sendEmail({ to: tour.agent.email, subject: title, html: emailLayout({ title, intro: `${tour.name} cancelled their tour request.`, rows: [["When", when]] }) });
  } else if (tour.userId) {
    await db.notification.create({ data: { userId: tour.userId, type: "TOUR_UPDATE", title, body: when, url: "/account/tours" } });
    if (tour.user?.email && (tour.user.notificationPrefs?.emailTourUpdates ?? true)) {
      await sendEmail({
        to: tour.user.email,
        subject: title,
        html: emailLayout({
          title,
          intro: action === "confirm" ? `${tour.agent?.name ?? "Your agent"} confirmed your tour.` : `Your tour is now ${status.toLowerCase()}.`,
          rows: [["When", when], ["Home", tour.listing.streetAddress]],
          cta: { label: "View your tours", url: `${site.url}/account/tours` },
        }),
      });
    }
  }
  return Response.json({ ok: true, status });
});
