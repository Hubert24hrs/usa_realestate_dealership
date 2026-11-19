import { db } from "@/lib/db";
import { withUser } from "@/server/api";

export const runtime = "nodejs";

const listingRef = { select: { slug: true, streetAddress: true, city: true, state: true } } as const;

/** "Download my data" (CCPA right to know / GDPR access & portability). Excludes auth secrets. */
export const GET = withUser(async ({ user }) => {
  const account = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      accounts: { select: { provider: true, createdAt: true } },
      notificationPrefs: true,
      favorites: { select: { createdAt: true, listing: listingRef } },
      collections: {
        select: {
          name: true,
          description: true,
          createdAt: true,
          items: { select: { sharedNote: true, createdAt: true, listing: listingRef } },
          members: { select: { email: true, role: true, isAgent: true, acceptedAt: true } },
        },
      },
      collectionMemberships: { select: { role: true, acceptedAt: true, collection: { select: { name: true } } } },
      savedSearches: { select: { name: true, path: true, filters: true, frequency: true, emailEnabled: true, pushEnabled: true, createdAt: true, lastNotifiedAt: true } },
      notes: { select: { body: true, updatedAt: true, listing: listingRef } },
      views: { select: { viewedAt: true, listing: listingRef }, orderBy: { viewedAt: "desc" } },
      tours: { select: { type: true, status: true, preferredDate: true, preferredTime: true, message: true, createdAt: true, listing: listingRef } },
      leads: { select: { type: true, status: true, message: true, phone: true, createdAt: true, listing: listingRef } },
      applications: { select: { status: true, moveInDate: true, applicant: true, employment: true, occupants: true, hasPets: true, petDetails: true, vehicles: true, references: true, createdAt: true, submittedAt: true, listing: listingRef } },
      leases: { select: { startDate: true, endDate: true, monthlyRent: true, securityDeposit: true, status: true, signatureName: true, signedAt: true, listing: listingRef } },
      payments: { select: { amountCents: true, periodStart: true, status: true, method: true, paidAt: true } },
      messages: { select: { conversationId: true, body: true, createdAt: true } },
      notifications: { select: { type: true, title: true, body: true, createdAt: true, readAt: true } },
      pushSubscriptions: { select: { createdAt: true } },
      reports: { select: { reason: true, details: true, createdAt: true, listing: listingRef } },
      ndaAgreements: { select: { name: true, email: true, company: true, role: true, acceptedAt: true, listing: listingRef } },
    },
  });
  const exportedAt = new Date();
  const body = JSON.stringify(
    {
      exportedAt: exportedAt.toISOString(),
      notice: "This file contains the personal information CITI VIEW holds about your account. Keep it somewhere safe.",
      account,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="citiview-data-${exportedAt.toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
});
