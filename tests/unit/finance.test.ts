import { describe, expect, it } from "vitest";
import { estimateClosingCosts, stateProfile, type ClosingInputs } from "@/lib/finance/closing-costs";
import { amortization, monthlyPayment, paymentBreakdown, payoffWithExtra, principalForPayment } from "@/lib/finance/mortgage";
import { rentVsBuy, type RentVsBuyInputs } from "@/lib/finance/rent-vs-buy";

describe("monthlyPayment", () => {
  it("matches the standard amortization formula", () => {
    expect(monthlyPayment(300_000, 6, 30)).toBeCloseTo(1798.65, 2);
    expect(monthlyPayment(200_000, 4.5, 15)).toBeCloseTo(1529.99, 2);
  });

  it("repays a 0% loan in equal installments and returns 0 for no loan", () => {
    expect(monthlyPayment(120_000, 0, 10)).toBeCloseTo(1_000, 6);
    expect(monthlyPayment(0, 6, 30)).toBe(0);
  });

  it("is inverted by principalForPayment", () => {
    const payment = monthlyPayment(450_000, 6.75, 30);
    expect(principalForPayment(payment, 6.75, 30)).toBeCloseTo(450_000, 4);
  });
});

describe("paymentBreakdown", () => {
  const base = { price: 500_000, ratePct: 6.5, termYears: 30, propertyTaxAnnual: 6_000, insuranceAnnual: 1_800, hoaMonthly: 50 };

  it("adds PMI only while the loan is above 80% of the price", () => {
    expect(paymentBreakdown({ ...base, downPayment: 50_000 }).pmi).toBeGreaterThan(0);
    expect(paymentBreakdown({ ...base, downPayment: 100_000 }).pmi).toBe(0);
  });

  it("totals every component", () => {
    const b = paymentBreakdown({ ...base, downPayment: 100_000 });
    expect(b.total).toBeCloseTo(b.principalAndInterest + 500 + 150 + 50, 6);
    expect(b.ltv).toBeCloseTo(0.8, 10);
  });
});

describe("amortization and payoffWithExtra", () => {
  it("pays the loan to zero over the full term", () => {
    const rows = amortization(250_000, 6, 30);
    expect(rows).toHaveLength(360);
    expect(rows.at(-1)!.balance).toBeLessThan(0.01);
    const principal = rows.reduce((s, r) => s + r.principal, 0);
    expect(principal).toBeCloseTo(250_000, 2);
  });

  it("matches the plain schedule when there is no extra payment", () => {
    const plain = payoffWithExtra(250_000, 6, 30);
    expect(plain.months).toBe(360);
    expect(plain.yearlyBalance).toHaveLength(30);
  });

  it("shortens the loan and saves interest with extra principal", () => {
    const plain = payoffWithExtra(250_000, 6, 30);
    const extra = payoffWithExtra(250_000, 6, 30, 300);
    expect(extra.months).toBeLessThan(plain.months - 60);
    expect(extra.totalInterest).toBeLessThan(plain.totalInterest * 0.8);
  });
});

describe("estimateClosingCosts", () => {
  const input: ClosingInputs = { price: 400_000, downPayment: 80_000, ratePct: 6.5, points: 0, state: "TX", cash: false, survey: false, sellerCredit: 0, earnestMoney: 0, closingDay: 15 };

  it("computes cash to close as down payment plus costs minus credits", () => {
    const e = estimateClosingCosts({ ...input, sellerCredit: 2_000, earnestMoney: 5_000 });
    expect(e.loanAmount).toBe(320_000);
    expect(e.cashToClose).toBe(Math.round(80_000 + e.closingCosts - 2_000 - 5_000));
    expect(e.closingCosts).toBe(e.groups.reduce((s, g) => s + g.total, 0));
  });

  it("keeps typical buyer costs in a realistic 1–6% band", () => {
    for (const state of ["TX", "CA", "FL", "NC", "WA", "US"]) {
      const pct = estimateClosingCosts({ ...input, state }).closingCostPct;
      expect(pct, state).toBeGreaterThan(0.01);
      expect(pct, state).toBeLessThan(0.06);
    }
  });

  it("drops lender fees for cash purchases", () => {
    const cash = estimateClosingCosts({ ...input, cash: true });
    expect(cash.loanAmount).toBe(0);
    expect(cash.groups.find((g) => g.key === "lender")).toBeUndefined();
    expect(cash.cashToClose).toBe(Math.round(400_000 + cash.closingCosts));
  });

  it("charges the buyer transfer tax only where the buyer customarily pays it", () => {
    const transfer = (state: string) => estimateClosingCosts({ ...input, state }).groups.find((g) => g.key === "government")!.lines.find((l) => l.key === "transfer")!.amount;
    expect(transfer("TX")).toBe(0); // no state transfer tax
    expect(transfer("WA")).toBe(0); // seller-paid
    expect(transfer("TN")).toBeGreaterThan(0); // buyer-paid
  });

  it("falls back to U.S. typical values for unknown states", () => {
    expect(stateProfile("ZZ").code).toBe("US");
  });
});

describe("rentVsBuy", () => {
  const base: RentVsBuyInputs = {
    homePrice: 400_000,
    downPct: 20,
    ratePct: 6.5,
    termYears: 30,
    years: 15,
    appreciationPct: 3.5,
    propertyTaxPct: 1.1,
    insuranceAnnual: 1_800,
    maintenancePct: 1,
    hoaMonthly: 0,
    buyCostPct: 3,
    sellCostPct: 6,
    rentMonthly: 2_600,
    rentGrowthPct: 3.5,
    rentersInsuranceMonthly: 20,
    investReturnPct: 5,
  };

  it("produces one row per year and an upfront cash figure", () => {
    const r = rentVsBuy(base);
    expect(r.rows).toHaveLength(15);
    expect(r.upfrontCash).toBe(80_000 + 12_000);
  });

  it("finds a break-even year when renting is expensive relative to buying", () => {
    expect(rentVsBuy({ ...base, rentMonthly: 3_200 }).breakEvenYear).not.toBeNull();
  });

  it("never breaks even when the home loses value and rent is cheap", () => {
    expect(rentVsBuy({ ...base, rentMonthly: 1_200, appreciationPct: -2 }).breakEvenYear).toBeNull();
  });

  it("breaks even sooner as rent rises", () => {
    const later = rentVsBuy({ ...base, rentMonthly: 2_800 }).breakEvenYear ?? Infinity;
    const sooner = rentVsBuy({ ...base, rentMonthly: 3_600 }).breakEvenYear ?? Infinity;
    expect(sooner).toBeLessThanOrEqual(later);
  });
});
