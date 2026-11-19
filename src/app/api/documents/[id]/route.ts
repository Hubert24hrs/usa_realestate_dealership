import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { formatAddressLine, formatNumber, formatPrice } from "@/lib/format";
import { buildPdf } from "@/lib/pdf";
import { ndaCookieName, ndaToken } from "@/server/nda";

export const runtime = "nodejs";

/** Serves a listing document. Confidential documents require a signed NDA (cookie set by /api/nda). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response("Not found", { status: 404 });
  const doc = await db.listingDocument.findUnique({ where: { id }, include: { listing: true } });
  if (!doc) return new Response("Not found", { status: 404 });
  if (doc.requiresNda) {
    const cookie = (await cookies()).get(ndaCookieName(doc.listingId))?.value;
    const [email, token] = cookie?.split("|") ?? [];
    if (!email || !token || token !== ndaToken(doc.listingId, email)) {
      return Response.json({ error: "Sign the confidentiality agreement to access this document." }, { status: 403 });
    }
  }
  const l = doc.listing;
  const pdf = buildPdf(`${doc.name}: ${formatAddressLine(l)}`, [
    { heading: "Property overview", body: `${l.headline ?? ""}\n${l.description}` },
    {
      heading: "Key facts",
      body: [
        `Asking price: ${formatPrice(l.price)}${l.transactionType === "LEASE" ? " per month (smallest suite)" : ""}`,
        l.capRate ? `Cap rate: ${l.capRate.toFixed(2)}%` : "",
        l.noi ? `Net operating income: ${formatPrice(l.noi)}` : "",
        l.buildingSqft ? `Building size: ${formatNumber(l.buildingSqft)} SF` : "",
        l.occupancyPct ? `Occupancy: ${l.occupancyPct}%` : "",
        l.zoning ? `Zoning: ${l.zoning}` : "",
        l.yearBuilt ? `Year built: ${l.yearBuilt}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    { heading: "Notice", body: "This is a generated sample document for the CITI VIEW platform. All figures are illustrative and must not be relied upon. Confidential: distribution limited to parties who executed the confidentiality agreement." },
  ]);
  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.kind.toLowerCase()}-${l.slug}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
