import type { Metadata } from "next";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { PreapprovalForm } from "@/components/mortgage/preapproval-form";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";

export const metadata: Metadata = {
  title: "Get preapproved for a mortgage",
  description: "Share a few details and a partner lender follows up with a personalized rate and preapproval letter. No credit check without your permission.",
  alternates: { canonical: "/mortgage/preapproval" },
};

const DOCS = ["Two recent pay stubs", "Two years of W2s or tax returns (self employed: two years of returns)", "Two months of bank and investment statements", "A government issued photo ID", "Details on any debts, alimony or child support"];

export default function PreapprovalPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Mortgage", href: "/mortgage" }, { name: "Get preapproved", href: "/mortgage/preapproval" }]}
        eyebrow="Preapproval"
        title="Get preapproved before you make an offer"
        description="Sellers take preapproved buyers more seriously. Tell us about your purchase and a partner lender will follow up."
      />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PreapprovalForm />
        <aside className="space-y-5" aria-label="About preapproval">
          <div className="rounded-3xl border bg-card p-5">
            <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-success" aria-hidden /> Preapproval vs. prequalification</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A prequalification is a quick estimate from what you tell a lender. A preapproval is stronger: the lender verifies income, assets and credit and issues a conditional commitment you can attach to offers.
            </p>
          </div>
          <div className="rounded-3xl border bg-card p-5">
            <p className="flex items-center gap-2 font-semibold"><FileCheck2 className="size-5 text-primary" aria-hidden /> Documents to gather</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {DOCS.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
        </aside>
      </div>
      <div className="container-page pb-10">
        <ToolDisclaimer>
          CITI VIEW is not a lender and does not make credit decisions. Requests are shared with a partner lender, currently &ldquo;Keystone Home Lending (sample partner)&rdquo;, NMLS #000000 (placeholder). Equal Housing Opportunity.
        </ToolDisclaimer>
      </div>
    </>
  );
}
