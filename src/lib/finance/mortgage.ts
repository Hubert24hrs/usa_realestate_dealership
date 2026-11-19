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

export interface PayoffSummary {
  months: number;
  totalInterest: number;
  /** Ending balance after each loan year (index 0 = end of year 1). */
  yearlyBalance: number[];
  yearly: Array<{ year: number; principal: number; interest: number; balance: number }>;
}

/** Amortize with an optional extra principal payment every month. */
export function payoffWithExtra(principal: number, annualRatePct: number, years: number, extraMonthly = 0): PayoffSummary {
  const pay = monthlyPayment(principal, annualRatePct, years);
  const r = annualRatePct / 100 / 12;
  const maxMonths = Math.round(years * 12);
  let balance = principal;
  let months = 0;
  let totalInterest = 0;
  const yearly: PayoffSummary["yearly"] = [];
  let yp = 0;
  let yi = 0;
  while (balance > 0.005 && months < maxMonths) {
    const interest = balance * r;
    const principalPart = Math.min(balance, pay - interest + Math.max(0, extraMonthly));
    balance = Math.max(0, balance - principalPart);
    totalInterest += interest;
    yp += principalPart;
    yi += interest;
    months++;
    if (months % 12 === 0 || balance <= 0.005) {
      yearly.push({ year: Math.ceil(months / 12), principal: yp, interest: yi, balance });
      yp = 0;
      yi = 0;
    }
  }
  return { months, totalInterest, yearlyBalance: yearly.map((y) => y.balance), yearly };
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
