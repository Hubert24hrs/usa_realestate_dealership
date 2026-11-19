import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrganizationProfile } from "@/components/agents/organization-views";
import { db } from "@/lib/db";
import { getOrganization } from "@/server/agents";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getOrganization(slug, "PROPERTY_MANAGEMENT");
  if (!data) return {};
  return {
    title: `${data.org.name}: property management`,
    description: data.org.tagline ?? `Rentals and communities managed by ${data.org.name}.`,
    alternates: { canonical: `/property-managers/${data.org.slug}` },
  };
}

export default async function PropertyManagerPage({ params }: PageProps) {
  const { slug } = await params;
  const [data, cities] = await Promise.all([getOrganization(slug, "PROPERTY_MANAGEMENT"), db.city.findMany({ select: { slug: true, name: true } })]);
  if (!data) notFound();
  return <OrganizationProfile type="PROPERTY_MANAGEMENT" data={data} cityNames={new Map(cities.map((c) => [c.slug, c.name]))} />;
}
