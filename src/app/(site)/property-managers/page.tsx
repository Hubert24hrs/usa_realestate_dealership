import type { Metadata } from "next";
import { OrganizationDirectory } from "@/components/agents/organization-views";
import { db } from "@/lib/db";
import { listOrganizations } from "@/server/agents";

export const metadata: Metadata = {
  title: "Property management companies",
  description: "Property management companies leasing homes and apartment communities on CITI VIEW.",
  alternates: { canonical: "/property-managers" },
};

export default async function PropertyManagersPage() {
  const [orgs, cities] = await Promise.all([listOrganizations("PROPERTY_MANAGEMENT"), db.city.findMany({ select: { slug: true, name: true } })]);
  return <OrganizationDirectory type="PROPERTY_MANAGEMENT" orgs={orgs} cityNames={new Map(cities.map((c) => [c.slug, c.name]))} />;
}
