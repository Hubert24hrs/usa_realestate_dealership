import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrganizationProfile } from "@/components/agents/organization-views";
import { db } from "@/lib/db";
import { getOrganization } from "@/server/agents";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getOrganization(slug, "BROKERAGE");
  if (!data) return {};
  return {
    title: `${data.org.name}: real estate brokerage`,
    description: data.org.tagline ?? `Agents, listings and markets served by ${data.org.name}.`,
    alternates: { canonical: `/brokerages/${data.org.slug}` },
  };
}

export default async function BrokeragePage({ params }: PageProps) {
  const { slug } = await params;
  const [data, cities] = await Promise.all([getOrganization(slug, "BROKERAGE"), db.city.findMany({ select: { slug: true, name: true } })]);
  if (!data) notFound();
  return <OrganizationProfile type="BROKERAGE" data={data} cityNames={new Map(cities.map((c) => [c.slug, c.name]))} />;
}
