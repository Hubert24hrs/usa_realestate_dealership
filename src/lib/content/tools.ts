/** Every calculator / tool page, with the post tags it's relevant to (for cross-linking). */
export type ToolIcon = "calculator" | "percent" | "wallet" | "receipt" | "scale" | "badge" | "piggy" | "key" | "map" | "trend" | "home" | "upload" | "book";

export interface ToolLink {
  slug: string;
  title: string;
  description: string;
  href: string;
  icon: ToolIcon;
  topics: string[];
}

export const TOOLS: ToolLink[] = [
  { slug: "mortgage-calculator", title: "Mortgage calculator", description: "Monthly payment with taxes, insurance, HOA and PMI, plus a full amortization schedule.", href: "/mortgage/calculator", icon: "calculator", topics: ["Buying", "Mortgage", "First-time buyers"] },
  { slug: "rates", title: "Today's sample rates", description: "Compare 30-year, 15-year, ARM, FHA, VA and jumbo rates and their 12-week trend.", href: "/mortgage/rates", icon: "percent", topics: ["Mortgage", "Buying"] },
  { slug: "affordability", title: "Home affordability", description: "How much home your income supports using lender-style debt-to-income limits.", href: "/mortgage/affordability", icon: "wallet", topics: ["Buying", "First-time buyers"] },
  { slug: "closing-costs", title: "Closing cost estimator", description: "Lender, title, government and prepaid costs — and your total cash to close.", href: "/mortgage/closing-costs", icon: "receipt", topics: ["Buying", "Mortgage"] },
  { slug: "rent-vs-buy", title: "Rent vs. buy", description: "Compare the true cost of renting and owning and find your break-even year.", href: "/mortgage/rent-vs-buy", icon: "scale", topics: ["Buying", "Renting", "First-time buyers"] },
  { slug: "preapproval", title: "Get pre-approved", description: "Share a few details and a partner lender follows up with a pre-approval.", href: "/mortgage/preapproval", icon: "badge", topics: ["Buying", "Mortgage", "First-time buyers"] },
  { slug: "down-payment-assistance", title: "Down payment assistance", description: "How grants and forgivable loans work, who qualifies and how to find programs.", href: "/mortgage/down-payment-assistance", icon: "piggy", topics: ["First-time buyers", "Buying"] },
  { slug: "rent-affordability", title: "Rent affordability", description: "What rent fits your income, plus the cash you'll need to move in.", href: "/rent/affordability", icon: "key", topics: ["Renting"] },
  { slug: "cost-of-living", title: "Cost of living", description: "Compare housing, groceries, transportation and more between cities.", href: "/rent/cost-of-living", icon: "map", topics: ["Renting", "Buying", "Neighborhood guide"] },
  { slug: "rent-trends", title: "Rent trends", description: "Median rent by city over time, with year-over-year change.", href: "/rent/trends", icon: "trend", topics: ["Renting", "Market update"] },
  { slug: "home-value", title: "What's my home worth?", description: "A comps-based estimate with a value range and the sales behind it.", href: "/home-value", icon: "home", topics: ["Selling", "Market update"] },
  { slug: "post-listing", title: "Post a listing", description: "Sell or rent by owner with photos, pricing guidance and Fair Housing checks.", href: "/sell/post", icon: "upload", topics: ["Selling"] },
  { slug: "glossary", title: "Real estate glossary", description: "Plain-English definitions of the terms you'll hear from agents and lenders.", href: "/learn/glossary", icon: "book", topics: ["Buying", "Selling", "Renting", "Mortgage", "Commercial", "Land"] },
];

export const toolsFor = (tags: string[], limit = 3) => {
  const scored = TOOLS.map((t) => ({ t, score: t.topics.filter((x) => tags.includes(x)).length - (t.slug === "glossary" ? 0.5 : 0) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const picks = scored.slice(0, limit).map((s) => s.t);
  return picks.length ? picks : TOOLS.filter((t) => ["mortgage-calculator", "home-value", "glossary"].includes(t.slug)).slice(0, limit);
};

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);
