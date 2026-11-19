import { monthlyPayment } from "./mortgage";

/**
 * Rent vs. buy as a net-worth race (pure). Both paths start with the same cash (down payment +
 * buying costs). Each month the cheaper path invests the difference at the investment return.
 * Owner net worth = home value after selling costs − loan balance + invested savings.
 * Ignores income-tax effects (most buyers take the standard deduction) and capital-gains tax.
 */
export interface RentVsBuyInputs {
  homePrice: number;
  downPct: number;
  ratePct: number;
  termYears: number;
  years: number;
  appreciationPct: number;
  propertyTaxPct: number;
  insuranceAnnual: number;
  maintenancePct: number;
  hoaMonthly: number;
  buyCostPct: number;
  sellCostPct: number;
  rentMonthly: number;
  rentGrowthPct: number;
  rentersInsuranceMonthly: number;
  investReturnPct: number;
}

export interface RentVsBuyYear {
  year: number;
  ownerNetWorth: number;
  renterNetWorth: number;
  ownerMonthlyCost: number;
  rentMonthly: number;
  homeValue: number;
  loanBalance: number;
}

export interface RentVsBuyResult {
  rows: RentVsBuyYear[];
  /** First year buying comes out ahead, or null if it never does within the horizon. */
  breakEvenYear: number | null;
  upfrontCash: number;
  firstYearOwnerMonthly: number;
  firstYearRentMonthly: number;
}

export function rentVsBuy(i: RentVsBuyInputs): RentVsBuyResult {
  const price = Math.max(0, i.homePrice);
  const down = (price * Math.min(100, Math.max(0, i.downPct))) / 100;
  const loan = Math.max(0, price - down);
  const upfront = down + (price * i.buyCostPct) / 100;
  const pi = monthlyPayment(loan, i.ratePct, i.termYears);
  const r = i.ratePct / 100 / 12;
  const inv = Math.pow(1 + i.investReturnPct / 100, 1 / 12) - 1;
  const appr = Math.pow(1 + i.appreciationPct / 100, 1 / 12) - 1;

  let balance = loan;
  let homeValue = price;
  let rent = i.rentMonthly;
  let renterPortfolio = upfront;
  let ownerPortfolio = 0;
  const rows: RentVsBuyYear[] = [];
  let firstOwner = 0;
  let firstRent = 0;

  for (let m = 1; m <= Math.round(i.years * 12); m++) {
    if (m > 1 && (m - 1) % 12 === 0) rent *= 1 + i.rentGrowthPct / 100;
    const interest = balance * r;
    const principal = balance > 0 ? Math.min(balance, pi - interest) : 0;
    const mortgage = balance > 0 ? interest + principal : 0;
    balance = Math.max(0, balance - principal);
    // PMI while the balance is above 80% of the purchase price (conventional assumption).
    const pmi = balance > price * 0.8 ? (loan * 0.006) / 12 : 0;
    const owner = mortgage + pmi + (homeValue * i.propertyTaxPct) / 100 / 12 + i.insuranceAnnual / 12 + (homeValue * i.maintenancePct) / 100 / 12 + i.hoaMonthly;
    const renter = rent + i.rentersInsuranceMonthly;
    if (m <= 12) {
      firstOwner += owner / 12;
      firstRent += renter / 12;
    }
    renterPortfolio *= 1 + inv;
    ownerPortfolio *= 1 + inv;
    if (owner > renter) renterPortfolio += owner - renter;
    else ownerPortfolio += renter - owner;
    homeValue *= 1 + appr;

    if (m % 12 === 0) {
      rows.push({
        year: m / 12,
        ownerNetWorth: homeValue * (1 - i.sellCostPct / 100) - balance + ownerPortfolio,
        renterNetWorth: renterPortfolio,
        ownerMonthlyCost: owner,
        rentMonthly: renter,
        homeValue,
        loanBalance: balance,
      });
    }
  }
  const be = rows.find((row) => row.ownerNetWorth >= row.renterNetWorth);
  return { rows, breakEvenYear: be?.year ?? null, upfrontCash: upfront, firstYearOwnerMonthly: firstOwner, firstYearRentMonthly: firstRent };
}
