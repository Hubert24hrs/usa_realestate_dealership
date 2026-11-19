import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { buildPdf } from "@/lib/pdf";
import { ID_RE, notFound, withUser } from "@/server/api";

export const runtime = "nodejs";

/** Download the lease (with the e-signature record once signed). Tenant or admin only. */
export const GET = withUser<{ id: string }>(async ({ user, params }) => {
  if (!ID_RE.test(params.id)) return notFound();
  const lease = await db.lease.findUnique({
    where: { id: params.id },
    include: { listing: { select: { communityName: true, streetAddress: true, city: true, state: true } }, unit: { select: { unitNumber: true } } },
  });
  if (!lease || (lease.tenantId !== user.id && user.role !== "ADMIN")) return notFound();
  const title = `Residential Lease - ${lease.listing.communityName ?? lease.listing.streetAddress}${lease.unit ? ` Unit ${lease.unit.unitNumber}` : ""}`;
  const signature = lease.signedAt
    ? `Signed electronically by ${lease.signatureName} on ${lease.signedAt.toISOString().replace("T", " ").slice(0, 19)} UTC.\nSignature record: ${lease.id} / IP hash ${lease.signatureIpHash?.slice(0, 16) ?? "n/a"}.\nLandlord: ${lease.landlordName ?? "Landlord"}.`
    : `Not yet signed. Generated ${formatDate(new Date())}.`;
  const pdf = buildPdf(title, [...lease.terms.split("\n\n").map((body) => ({ body })), { heading: "Signatures", body: signature }]);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="lease-${lease.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
