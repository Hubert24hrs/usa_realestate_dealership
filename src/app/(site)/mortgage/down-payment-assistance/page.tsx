import type { Metadata } from "next";
import Link from "@/components/app-link";
import { DpaChecklist } from "@/components/mortgage/dpa-checklist";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Down payment assistance: grants, forgivable loans and how to qualify",
  description: "How down payment assistance programs work, including grants, forgivable and deferred loans, matched savings and mortgage credit certificates, plus who usually qualifies and how to find programs.",
  alternates: { canonical: "/mortgage/down-payment-assistance" },
};

const TYPES = [
  ["Grants", "Money toward your down payment or closing costs that you don't repay. Some require you to live in the home for a few years."],
  ["Forgivable loans", "A second loan that's forgiven a little each year you stay, often over five to ten years. Sell or refinance early and you may repay part of it."],
  ["Deferred payment loans", "No monthly payment and often no interest; you repay when you sell, refinance or pay off your first mortgage."],
  ["Low rate second mortgages", "Repaid monthly alongside your main mortgage, usually at a below market rate."],
  ["Matched savings", "Programs that match what you save toward a home, sometimes two or three to one, often paired with financial coaching."],
  ["Mortgage credit certificates", "A federal income tax credit for part of the mortgage interest you pay each year, issued through state and local housing agencies."],
] as const;

const RULES = [
  ["First time buyer status", "Many programs define this as not having owned a home in the past three years, so prior owners can still qualify."],
  ["Income limits", "Usually tied to the area median income for your county and household size, so limits differ a lot by location."],
  ["Price limits", "A maximum purchase price that also varies by county."],
  ["Credit and debt", "Minimum credit scores (often around 620 to 660) and debt to income limits similar to the first mortgage."],
  ["Homebuyer education", "A short course, often online, completed before closing."],
  ["Owner occupancy", "You must live in the home as your primary residence."],
] as const;

const QUESTIONS = [
  "Is it a grant or a loan, and if it's a loan, when is it repaid or forgiven?",
  "What happens if I sell or refinance in the first few years?",
  "Can it be combined with an FHA, VA, USDA or conventional first mortgage?",
  "Does using the program change my interest rate or lender fees?",
  "How much of my own money must I contribute?",
  "How long does approval add to my closing timeline?",
];

export default function DownPaymentAssistancePage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Mortgage", href: "/mortgage" }, { name: "Down payment assistance", href: "/mortgage/down-payment-assistance" }]}
        eyebrow="Down payment assistance"
        title="Help with your down payment is more common than you think"
        description="Thousands of programs (run by state housing finance agencies, cities, counties, nonprofits and employers) help eligible buyers with the down payment and closing costs."
      />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="types-title">
            <h2 id="types-title" className="font-display text-2xl font-semibold tracking-tight">Types of assistance</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {TYPES.map(([t, d]) => (
                <div key={t} className="rounded-2xl border bg-card p-4">
                  <dt className="font-semibold">{t}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{d}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="rules-title">
            <h2 id="rules-title" className="font-display text-2xl font-semibold tracking-tight">Who usually qualifies</h2>
            <dl className="mt-5 space-y-3">
              {RULES.map(([t, d]) => (
                <div key={t} className="flex flex-col gap-1 border-b pb-3 sm:flex-row sm:gap-6">
                  <dt className="w-48 shrink-0 font-medium">{t}</dt>
                  <dd className="text-sm text-muted-foreground">{d}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="find-title" className="prose-cv">
            <h2 id="find-title">How to find programs</h2>
            <ol>
              <li><strong>Start with your state housing finance agency (HFA).</strong> Most states run first time buyer and assistance programs through approved lenders.</li>
              <li><strong>Check your city and county.</strong> Local housing departments often fund their own grants, especially in higher cost areas.</li>
              <li><strong>Ask a lender that participates.</strong> Programs only work through approved lenders, and a good loan officer will know which ones you can stack.</li>
              <li><strong>Look for profession and employer programs.</strong> Some employers, unions and community organizations help teachers, first responders, health workers and employees buy near work.</li>
            </ol>
          </section>

          <section aria-labelledby="ask-title">
            <h2 id="ask-title" className="font-display text-2xl font-semibold tracking-tight">Questions to ask before you sign</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {QUESTIONS.map((q) => (
                <li key={q} className="rounded-xl border bg-card p-3 text-sm">{q}</li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start" aria-label="Check your fit">
          <DpaChecklist />
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <p className="font-semibold">Run your numbers</p>
            <p className="mt-1 text-sm text-muted-foreground">See how assistance changes what you can afford and your cash to close.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm"><Link href="/mortgage/affordability">Affordability</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/mortgage/closing-costs">Closing costs</Link></Button>
            </div>
          </div>
        </aside>
      </div>
      <div className="container-page pb-10">
        <ToolDisclaimer>
          General information, not financial advice. Program names, amounts and rules change often and vary by location; confirm current terms with the program administrator or a participating lender.
        </ToolDisclaimer>
      </div>
    </>
  );
}
