import type { Metadata } from "next";
import { OrganizationDirectory } from "@/components/agents/organization-views";
import { db } from "@/lib/db";
import { listOrganizations } from "@/server/agents";

export const metadata: Metadata = {
  title: "Real estate brokerages",
  description: "Browse real estate brokerages on CITI VIEW — their agents, active listings and the markets they serve.",
  alternates: { canonical: "/brokerages" },
};

export default async function BrokeragesPage() {
  const [orgs, cities] = await Promise.all([listOrganizations("BROKERAGE"), db.city.findMany({ select: { slug: true, name: true } })]);
  return <OrganizationDirectory type="BROKERAGE" orgs={orgs} cityNames={new Map(cities.map((c) => [c.slug, c.name]))} />;
}
