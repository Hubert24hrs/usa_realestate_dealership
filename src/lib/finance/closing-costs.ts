/**
 * Buyer closing-cost estimator (pure). State profiles are typical, illustrative values for
 * planning — local transfer taxes, title rates and customs vary by county and city.
 * The lender's Loan Estimate is always the authority.
 */

export type Payer = "buyer" | "seller" | "split" | "none";

export interface StateProfile {
  code: string;
  name: string;
  /** Typical combined deed/transfer tax as a % of price. */
  transferTaxPct: number;
  transferTaxPayer: Payer;
  /** Owner's title policy cost per $1,000 of price (approximate). */
  ownerTitlePerK: number;
  ownerTitlePaidBy: "buyer" | "seller";
  /** Mortgage / intangible taxes as a % of the loan (buyer). */
  mortgageTaxPct: number;
  /** Typical effective property-tax rate (% of value per year). */
  propertyTaxPct: number;
  /** Typical homeowners insurance (% of value per year). */
  insurancePct: number;
  /** An attorney customarily conducts the closing. */
  attorneyClosing: boolean;
}

export const STATE_PROFILES: StateProfile[] = [
  { code: "AZ", name: "Arizona", transferTaxPct: 0, transferTaxPayer: "none", ownerTitlePerK: 4.6, ownerTitlePaidBy: "seller", mortgageTaxPct: 0, propertyTaxPct: 0.6, insurancePct: 0.45, attorneyClosing: false },
  { code: "CA", name: "California", transferTaxPct: 0.11, transferTaxPayer: "seller", ownerTitlePerK: 3.4, ownerTitlePaidBy: "seller", mortgageTaxPct: 0, propertyTaxPct: 1.15, insurancePct: 0.35, attorneyClosing: false },
  { code: "CO", name: "Colorado", transferTaxPct: 0.01, transferTaxPayer: "buyer", ownerTitlePerK: 3.2, ownerTitlePaidBy: "seller", mortgageTaxPct: 0, propertyTaxPct: 0.55, insurancePct: 0.55, attorneyClosing: false },
  { code: "FL", name: "Florida", transferTaxPct: 0.7, transferTaxPayer: "seller", ownerTitlePerK: 5.75, ownerTitlePaidBy: "seller", mortgageTaxPct: 0.55, propertyTaxPct: 0.95, insurancePct: 1.4, attorneyClosing: false },
  { code: "GA", name: "Georgia", transferTaxPct: 0.1, transferTaxPayer: "seller", ownerTitlePerK: 3.3, ownerTitlePaidBy: "buyer", mortgageTaxPct: 0.3, propertyTaxPct: 0.9, insurancePct: 0.7, attorneyClosing: true },
  { code: "IL", name: "Illinois", transferTaxPct: 0.15, transferTaxPayer: "seller", ownerTitlePerK: 2.6, ownerTitlePaidBy: "seller", mortgageTaxPct: 0, propertyTaxPct: 2.0, insurancePct: 0.5, attorneyClosing: true },
  { code: "MT", name: "Montana", transferTaxPct: 0, transferTaxPayer: "none", ownerTitlePerK: 3.6, ownerTitlePaidBy: "seller", mortgageTaxPct: 0, propertyTaxPct: 0.75, insurancePct: 0.6, attorneyClosing: false },
  { code: "NC", name: "North Carolina", transferTaxPct: 0.2, transferTaxPayer: "seller", ownerTitlePerK: 2.0, ownerTitlePaidBy: "buyer", mortgageTaxPct: 0, propertyTaxPct: 0.8, insurancePct: 0.6, attorneyClosing: true },
  { code: "TN", name: "Tennessee", transferTaxPct: 0.37, transferTaxPayer: "buyer", ownerTitlePerK: 3.0, ownerTitlePaidBy: "buyer", mortgageTaxPct: 0.115, propertyTaxPct: 0.6, insurancePct: 0.6, attorneyClosing: false },
  { code: "TX", name: "Texas", transferTaxPct: 0, transferTaxPayer: "none", ownerTitlePerK: 6.0, ownerTitlePaidBy: "seller", mortgageTaxPct: 0, propertyTaxPct: 1.75, insurancePct: 0.9, attorneyClosing: false },
  { code: "WA", name: "Washington", transferTaxPct: 1.78, transferTaxPayer: "seller", ownerTitlePerK: 3.8, ownerTitlePaidBy: "seller", mortgageTaxPct: 0, propertyTaxPct: 0.9, insurancePct: 0.4, attorneyClosing: false },
  { code: "US", name: "Other state (U.S. typical)", transferTaxPct: 0.3, transferTaxPayer: "split", ownerTitlePerK: 3.5, ownerTitlePaidBy: "buyer", mortgageTaxPct: 0, propertyTaxPct: 1.1, insurancePct: 0.6, attorneyClosing: false },
];

export const stateProfile = (code: string) => STATE_PROFILES.find((s) => s.code === code) ?? STATE_PROFILES[STATE_PROFILES.length - 1]!;

export interface ClosingInputs {
  price: number;
  downPayment: number;
  ratePct: number;
  /** Discount points purchased (1 point = 1% of the loan). */
  points: number;
  state: string;
  cash: boolean;
  /** Include a property survey. */
  survey: boolean;
  /** Seller-paid credits toward closing costs. */
  sellerCredit: number;
  /** Earnest money already deposited (credited at closing). */
  earnestMoney: number;
  /** Day of month you close on (prepaid interest runs to month end). */
  closingDay: number;
}

export interface CostLine {
  key: string;
  label: string;
  amount: number;
  note?: string;
}

export interface CostGroup {
  key: "lender" | "title" | "government" | "prepaids";
  label: string;
  lines: CostLine[];
  total: number;
}

export interface ClosingEstimate {
  loanAmount: number;
  groups: CostGroup[];
  closingCosts: number;
  closingCostPct: number;
  cashToClose: number;
}

const share = (p: Payer) => (p === "buyer" ? 1 : p === "split" ? 0.5 : 0);
const round = (n: number) => Math.round(n);

export function estimateClosingCosts(i: ClosingInputs): ClosingEstimate {
  const s = stateProfile(i.state);
  const price = Math.max(0, i.price);
  const loanAmount = i.cash ? 0 : Math.max(0, price - Math.min(i.downPayment, price));
  const hasLoan = loanAmount > 0;

  const lender: CostLine[] = hasLoan
    ? [
        { key: "origination", label: "Origination fee", amount: loanAmount * 0.005, note: "0.5% of the loan" },
        { key: "processing", label: "Processing & underwriting", amount: 1_095 },
        { key: "points", label: `Discount points (${i.points})`, amount: (loanAmount * Math.max(0, i.points)) / 100 },
        { key: "appraisal", label: "Appraisal", amount: loanAmount > 1_000_000 ? 950 : 625 },
        { key: "credit", label: "Credit report, flood & tax service", amount: 165 },
      ].filter((l) => l.key !== "points" || l.amount > 0)
    : [];

  const ownerTitle = s.ownerTitlePaidBy === "buyer" ? (price * s.ownerTitlePerK) / 1000 : 0;
  const title: CostLine[] = [
    ...(hasLoan ? [{ key: "lender-title", label: "Lender's title policy", amount: Math.max(350, loanAmount * 0.0022) }] : []),
    { key: "owner-title", label: "Owner's title policy", amount: ownerTitle, note: s.ownerTitlePaidBy === "seller" ? `Customarily paid by the seller in ${s.name}` : undefined },
    { key: "settlement", label: s.attorneyClosing ? "Closing attorney & settlement" : "Escrow / settlement fee", amount: (s.attorneyClosing ? 1_050 : 650) + price * 0.0005 },
    { key: "search", label: "Title search & endorsements", amount: 425 },
    ...(i.survey ? [{ key: "survey", label: "Property survey", amount: 475 }] : []),
  ];

  const transferShare = share(s.transferTaxPayer);
  const government: CostLine[] = [
    { key: "recording", label: "Recording fees", amount: hasLoan ? 185 : 95 },
    {
      key: "transfer",
      label: "Transfer tax (your share)",
      amount: (price * s.transferTaxPct * transferShare) / 100,
      note: s.transferTaxPayer === "none" ? `No state transfer tax in ${s.name}` : s.transferTaxPayer === "seller" ? "Customarily paid by the seller" : s.transferTaxPayer === "split" ? "Often split with the seller" : undefined,
    },
    ...(hasLoan && s.mortgageTaxPct > 0 ? [{ key: "mortgage-tax", label: "Mortgage / intangible taxes", amount: (loanAmount * s.mortgageTaxPct) / 100 }] : []),
  ];

  const daysLeft = Math.max(1, 31 - Math.min(31, Math.max(1, i.closingDay)));
  const insuranceYear = (price * s.insurancePct) / 100;
  const prepaids: CostLine[] = [
    ...(hasLoan ? [{ key: "interest", label: `Prepaid interest (${daysLeft} days)`, amount: ((loanAmount * i.ratePct) / 100 / 365) * daysLeft }] : []),
    { key: "insurance", label: "Homeowners insurance (first year)", amount: insuranceYear },
    ...(hasLoan
      ? [
          { key: "escrow-tax", label: "Escrow deposit: property taxes (3 mo)", amount: ((price * s.propertyTaxPct) / 100 / 12) * 3 },
          { key: "escrow-ins", label: "Escrow deposit: insurance (2 mo)", amount: (insuranceYear / 12) * 2 },
        ]
      : []),
  ];

  const group = (key: CostGroup["key"], label: string, lines: CostLine[]): CostGroup => {
    const rounded = lines.map((l) => ({ ...l, amount: round(l.amount) }));
    return { key, label, lines: rounded, total: rounded.reduce((a, l) => a + l.amount, 0) };
  };
  const groups = [
    group("lender", "Lender fees", lender),
    group("title", "Title & settlement", title),
    group("government", "Government & taxes", government),
    group("prepaids", "Prepaids & escrow", prepaids),
  ].filter((g) => g.lines.length);
  const closingCosts = groups.reduce((a, g) => a + g.total, 0);
  const down = i.cash ? price : Math.min(i.downPayment, price);
  const cashToClose = Math.max(0, down + closingCosts - Math.max(0, i.sellerCredit) - Math.max(0, i.earnestMoney));
  return { loanAmount, groups, closingCosts, closingCostPct: price > 0 ? closingCosts / price : 0, cashToClose: round(cashToClose) };
}
