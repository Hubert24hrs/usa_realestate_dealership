import { paymentBreakdown } from "./mortgage";

export interface AffordabilityInputs {
  annualIncome: number;
  monthlyDebts: number;
  downPayment: number;
  ratePct: number;
  termYears: number;
  /** Property tax as a fraction of price per year (e.g. 0.011). */
  taxRate: number;
  /** Insurance as a fraction of price per year. */
  insuranceRate: number;
  hoaMonthly: number;
  /** Front-end (housing) and back-end (total debt) DTI limits. */
  frontDti?: number;
  backDti?: number;
}

/** Largest price whose full monthly payment fits both DTI limits (28/36 by default). */
export function maxAffordablePrice(i: AffordabilityInputs): { maxPrice: number; maxHousingPayment: number } {
  const gross = i.annualIncome / 12;
  const front = gross * (i.frontDti ?? 0.28);
  const back = gross * (i.backDti ?? 0.36) - i.monthlyDebts;
  const maxHousingPayment = Math.max(0, Math.min(front, back));
  const payment = (price: number) =>
    paymentBreakdown({
      price,
      downPayment: Math.min(i.downPayment, price),
      ratePct: i.ratePct,
      termYears: i.termYears,
      propertyTaxAnnual: price * i.taxRate,
      insuranceAnnual: price * i.insuranceRate,
      hoaMonthly: i.hoaMonthly,
    }).total;
  let lo = 0;
  let hi = Math.max(50_000, i.downPayment + i.annualIncome * 12);
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (payment(mid) <= maxHousingPayment) lo = mid;
    else hi = mid;
  }
  return { maxPrice: Math.floor(lo / 1000) * 1000, maxHousingPayment };
}

export type AffordabilityVerdict = "comfortable" | "within" | "stretch" | "over";

export function verdictFor(price: number, maxPrice: number): AffordabilityVerdict {
  if (maxPrice <= 0) return "over";
  const r = price / maxPrice;
  if (r <= 0.85) return "comfortable";
  if (r <= 1) return "within";
  if (r <= 1.12) return "stretch";
  return "over";
}

/** Rent affordability: the 30% rule and the common "40× monthly rent" income screen. */
export function rentAffordability(annualIncome: number, monthlyDebts = 0) {
  const gross = annualIncome / 12;
  return {
    thirtyPercent: Math.round(gross * 0.3),
    fortyTimes: Math.round(annualIncome / 40),
    afterDebts: Math.max(0, Math.round(gross * 0.36 - monthlyDebts)),
  };
}
