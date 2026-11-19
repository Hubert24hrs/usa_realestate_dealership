import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { ID_RE, notFound, withUser } from "@/server/api";

export const runtime = "nodejs";

const pad = (n: number) => String(n).padStart(2, "0");
const icsDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const escape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");

/** Wall-clock time as an iCalendar "floating" time (no Z), so it reads as local time in the attendee's calendar. */
const floating = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;

/** The stored tour day plus the requested time ("10:00 AM"); vaguer slots ("Afternoon") get a sensible hour. */
function startOf(date: Date, time: string): Date {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  let hours = 10;
  let minutes = 0;
  if (match) {
    hours = (Number(match[1]) % 12) + (match[3]!.toUpperCase() === "PM" ? 12 : 0);
    minutes = Number(match[2]);
  } else if (/afternoon/i.test(time)) hours = 14;
  else if (/evening/i.test(time)) hours = 17;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes));
}

/** Downloadable calendar invite for a tour the user booked (or the agent is running). */
export const GET = withUser<{ id: string }>(async ({ user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const tour = await db.tourRequest.findUnique({
    where: { id: params.id },
    include: { listing: { select: { slug: true, streetAddress: true, unit: true, city: true, state: true, zip: true } }, agent: { select: { name: true, phone: true, userId: true } } },
  });
  if (!tour || (tour.userId !== user.id && tour.agent?.userId !== user.id && user.role !== "ADMIN")) return notFound();
  const start = startOf(tour.preferredDate, tour.preferredTime);
  const end = new Date(start.getTime() + 45 * 60_000);
  const address = `${tour.listing.streetAddress}${tour.listing.unit ? ` ${tour.listing.unit}` : ""}, ${tour.listing.city}, ${tour.listing.state} ${tour.listing.zip}`;
  const details = [
    tour.type === "VIDEO" ? "Video tour. Your agent will send the call link." : "In person tour.",
    tour.agent ? `Agent: ${tour.agent.name}${tour.agent.phone ? ` · ${tour.agent.phone}` : ""}` : null,
    `Listing: ${site.url}/property/${tour.listing.slug}`,
    tour.status === "REQUESTED" ? "Status: requested. Awaiting confirmation." : `Status: ${tour.status.toLowerCase()}.`,
  ]
    .filter(Boolean)
    .join("\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CITI VIEW//Tours//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:tour-${tour.id}@citiview`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${floating(start)}`,
    `DTEND:${floating(end)}`,
    `SUMMARY:${escape(`${tour.type === "VIDEO" ? "Video tour" : "Home tour"}: ${tour.listing.streetAddress}`)}`,
    `LOCATION:${escape(tour.type === "VIDEO" ? "Video call" : address)}`,
    `DESCRIPTION:${escape(details)}`,
    `STATUS:${tour.status === "CANCELLED" ? "CANCELLED" : tour.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="citiview-tour-${tour.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
});
