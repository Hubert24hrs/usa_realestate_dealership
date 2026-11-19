import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { ListingImage } from "@/components/media/listing-image";
import { ApplicationWizard, type WizardDraft } from "@/components/rent/application-wizard";
import { ScamCallout } from "@/components/rent/scam-callout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/server/auth-helpers";

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const ID_RE = /^[a-z0-9]{10,40}$/i;
/** Calendar day of a stored date (noon-UTC form dates and local-midnight seed dates alike). */
const ymd = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 11 * 3_600_000).toISOString().slice(0, 10) : null);

export const metadata: Metadata = { title: "Apply online", robots: { index: false, follow: false } };

export default async function ApplyPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  if (!/^[a-z0-9-]{3,160}$/.test(slug)) notFound();
  const query = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : []))).toString();
  const user = await requireUser(`/rent/apply/${slug}${query ? `?${query}` : ""}`);

  const listing = await db.listing.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, category: true, status: true, price: true, communityName: true, streetAddress: true, unit: true, city: true, state: true, zip: true,
      applicationFee: true, leaseTermMonths: true, availableDate: true, petsAllowed: true, catsAllowed: true, dogsAllowed: true, petDeposit: true, petRent: true, petPolicy: true,
      units: { where: { isAvailable: true }, orderBy: [{ rent: "asc" }], select: { id: true, unitNumber: true, floorPlan: true, beds: true, baths: true, sqft: true, rent: true, availableDate: true } },
      media: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, alt: true, blurDataUrl: true, width: true, height: true } },
    },
  });
  if (!listing || listing.category !== "RENTAL") notFound();
  const title = listing.communityName ?? `${listing.streetAddress}${listing.unit ? ` #${listing.unit}` : ""}`;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: title, href: `/property/${listing.slug}` },
    { name: "Apply", href: `/rent/apply/${listing.slug}` },
  ];

  const active = await db.rentalApplication.findFirst({ where: { userId: user.id, listingId: listing.id, status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] } }, select: { status: true } });
  const accepting = ["ACTIVE", "COMING_SOON"].includes(listing.status);

  const appParam = first(sp.app);
  const draftRow = await db.rentalApplication.findFirst({
    where: { userId: user.id, listingId: listing.id, status: "DRAFT", ...(appParam && ID_RE.test(appParam) ? { id: appParam } : {}) },
    orderBy: { updatedAt: "desc" },
  });
  const unitParam = first(sp.unit);
  const initialUnitId = listing.units.find((u) => u.id === unitParam)?.id ?? null;

  const draft: WizardDraft | null = draftRow
    ? {
        id: draftRow.id,
        unitId: draftRow.unitId,
        moveInDate: ymd(draftRow.moveInDate),
        leaseTermMonths: draftRow.leaseTermMonths,
        applicant: (draftRow.applicant ?? {}) as WizardDraft["applicant"],
        employment: (draftRow.employment ?? null) as WizardDraft["employment"],
        // `vehicles` is only written by the household step, so it marks that step as done.
        household: draftRow.vehicles != null ? { occupants: draftRow.occupants, hasPets: draftRow.hasPets, petDetails: draftRow.petDetails ?? "", vehicles: draftRow.vehicles } : null,
        references: Array.isArray(draftRow.references) ? (draftRow.references as WizardDraft["references"]) : [],
      }
    : null;

  const fullName = user.name?.trim() ?? "";
  const profileRow = await db.user.findUnique({ where: { id: user.id }, select: { phone: true } });
  const profile = { firstName: fullName.split(/\s+/)[0] ?? "", lastName: fullName.split(/\s+/).slice(1).join(" "), email: user.email ?? "", phone: profileRow?.phone ?? "" };
  const petsNote = !listing.petsAllowed
    ? "This home doesn't allow pets — assistance animals are always welcome."
    : [listing.petPolicy, listing.petDeposit ? `Pet deposit ${formatMoney(listing.petDeposit)}` : null, listing.petRent ? `pet rent ${formatMoney(listing.petRent)}/mo` : null].filter(Boolean).join(" · ");
  const photo = listing.media[0];

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={crumbs} className="mb-4" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <p className="eyebrow">Rental application</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Apply for {title}</h1>
          <p className="mt-1 text-muted-foreground">{listing.city}, {listing.state} {listing.zip} · takes about 10 minutes · saves as you go</p>
          <div className="mt-6">
            {active ? (
              <div className="rounded-3xl border bg-card p-6">
                <CheckCircle2 className="size-8 text-success" aria-hidden />
                <h2 className="mt-3 text-xl font-semibold">You&apos;ve already applied</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your application is {active.status === "APPROVED" ? "approved" : "being reviewed"}. Track it in your renter dashboard.</p>
                <Button asChild className="mt-4"><Link href="/account/rentals">Open renter dashboard</Link></Button>
              </div>
            ) : !accepting ? (
              <div className="rounded-3xl border bg-card p-6">
                <h2 className="text-xl font-semibold">This rental isn&apos;t accepting applications</h2>
                <p className="mt-1 text-sm text-muted-foreground">It may have been leased. <Link href="/apartments-for-rent" className="font-medium text-primary hover:underline">See similar rentals</Link></p>
              </div>
            ) : (
              <ApplicationWizard
                listing={{
                  id: listing.id,
                  slug: listing.slug,
                  title,
                  rent: listing.price,
                  applicationFee: listing.applicationFee ?? 0,
                  defaultTerm: [6, 9, 12, 15, 18, 24].includes(listing.leaseTermMonths ?? 12) ? (listing.leaseTermMonths ?? 12) : 12,
                  availableDate: ymd(listing.availableDate),
                  petsNote,
                  units: listing.units.map((u) => ({ ...u, availableDate: ymd(u.availableDate) })),
                }}
                draft={draft}
                initialUnitId={initialUnitId}
                profile={profile}
                canceled={first(sp.canceled) === "1"}
              />
            )}
          </div>
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start" aria-label="About this home">
          <div className="overflow-hidden rounded-3xl border bg-card">
            {photo && (
              <div className="relative aspect-[3/2]">
                <ListingImage src={photo.url} alt={photo.alt} blurDataUrl={photo.blurDataUrl} fill sizes="340px" className="object-cover" />
              </div>
            )}
            <div className="p-4">
              <Link href={`/property/${listing.slug}`} className="font-semibold hover:underline">{title}</Link>
              <p className="text-sm text-muted-foreground">{listing.city}, {listing.state}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-muted-foreground">Rent</dt><dd className="font-semibold">{listing.units.length ? `From ${formatMoney(listing.units[0]!.rent)}` : formatMoney(listing.price)}/mo</dd></div>
                <div><dt className="text-muted-foreground">Application fee</dt><dd className="font-semibold">{listing.applicationFee ? formatMoney(listing.applicationFee) : "None"}</dd></div>
              </dl>
            </div>
          </div>
          <div className="rounded-3xl border bg-card p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold"><ClipboardList className="size-4" aria-hidden /> Have these handy</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Current and past addresses</li>
              <li>Employer and monthly income</li>
              <li>Pet details, if any</li>
              <li>A reference (optional)</li>
            </ul>
          </div>
          <ScamCallout compact />
        </aside>
      </div>
    </div>
  );
}
