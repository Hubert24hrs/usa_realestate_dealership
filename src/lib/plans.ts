/** Paid plans for agents. Prices are list prices for the demo; Stripe price IDs come from env. */
export type PlanKey = "FREE" | "PRO" | "PREMIER";

export const PLANS: Record<PlanKey, { name: string; monthly: number; leadWeight: number; tagline: string; features: string[] }> = {
  FREE: {
    name: "Free",
    monthly: 0,
    leadWeight: 1,
    tagline: "Get found and manage your own leads.",
    features: ["Agent profile with reviews and sales history", "Leads from your own listings and profile", "Tour requests and messaging", "Basic listing stats"],
  },
  PRO: {
    name: "Pro",
    monthly: 49,
    leadWeight: 2,
    tagline: "More buyer and seller leads in your markets.",
    features: ["Everything in Free", "2× weight in area lead routing", "Listing engagement analytics", "Rental application review tools", "Priority support"],
  },
  PREMIER: {
    name: "Premier",
    monthly: 149,
    leadWeight: 3,
    tagline: "Top placement for agents who want to scale.",
    features: ["Everything in Pro", "3× weight in area lead routing", "Featured placement in agent search (clearly labelled)", "Featured badge on your profile and listings"],
  },
};

export const PAID_PLANS = ["PRO", "PREMIER"] as const;
