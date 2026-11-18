/** Mortgage math (pure, unit-tested). Rates are annual percentages, e.g. 6.25. */

export function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0) return 0;
  const n = Math.round(years * 12);
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
}

export interface PaymentInputs {
  price: number;
  downPayment: number;
  ratePct: number;
  termYears: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  /** Annual PMI as % of the loan, applied while LTV > 80% (conventional). */
  pmiRatePct?: number;
}

export interface PaymentBreakdown {
  loanAmount: number;
  ltv: number;
  principalAndInterest: number;
  propertyTax: number;
  insurance: number;
  hoa: number;
  pmi: number;
  total: number;
}

export function paymentBreakdown(i: PaymentInputs): PaymentBreakdown {
  const loanAmount = Math.max(0, i.price - i.downPayment);
  const ltv = i.price > 0 ? loanAmount / i.price : 0;
  const principalAndInterest = monthlyPayment(loanAmount, i.ratePct, i.termYears);
  const pmi = ltv > 0.8 ? (loanAmount * ((i.pmiRatePct ?? 0.6) / 100)) / 12 : 0;
  const propertyTax = i.propertyTaxAnnual / 12;
  const insurance = i.insuranceAnnual / 12;
  const total = principalAndInterest + propertyTax + insurance + i.hoaMonthly + pmi;
  return { loanAmount, ltv, principalAndInterest, propertyTax, insurance, hoa: i.hoaMonthly, pmi, total };
}

/** Largest loan whose P&I equals `payment`. */
export function principalForPayment(payment: number, annualRatePct: number, years: number): number {
  if (payment <= 0) return 0;
  const n = Math.round(years * 12);
  const r = annualRatePct / 100 / 12;
  if (r === 0) return payment * n;
  const f = Math.pow(1 + r, n);
  return (payment * (f - 1)) / (r * f);
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function amortization(principal: number, annualRatePct: number, years: number): AmortizationRow[] {
  const pay = monthlyPayment(principal, annualRatePct, years);
  const r = annualRatePct / 100 / 12;
  const rows: AmortizationRow[] = [];
  let balance = principal;
  for (let m = 1; m <= Math.round(years * 12); m++) {
    const interest = balance * r;
    const principalPart = Math.min(balance, pay - interest);
    balance = Math.max(0, balance - principalPart);
    rows.push({ month: m, payment: pay, principal: principalPart, interest, balance });
  }
  return rows;
}
