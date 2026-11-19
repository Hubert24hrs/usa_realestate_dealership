import { describe, expect, it } from "vitest";
import { formatAcres, formatCompactPrice, formatMoney, formatNumber, formatPrice } from "@/lib/format";

// format.ts hand-rolls en-US number formatting (Intl start-up is slow on phones); keep it identical to Intl.
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const SAMPLES = [0, 1, 7.5, 99.49, 999, 1000, 1234.5, 12_345.678, 999_999.5, 1_000_000, 2_450_000, 123_456_789, -5, -1234.5, -0.4];

describe("number formatting matches Intl en-US", () => {
  it.each(SAMPLES)("formatPrice(%d)", (n) => expect(formatPrice(n)).toBe(usd0.format(n)));
  it.each(SAMPLES)("formatMoney(%d, cents)", (n) => expect(formatMoney(n, true)).toBe(usd2.format(n)));
  it.each(SAMPLES)("formatNumber(%d)", (n) => expect(formatNumber(n)).toBe(int.format(n)));

  it("keeps the placeholder for missing values and compact/acre helpers working", () => {
    expect(formatPrice(null)).toBe("N/A");
    expect(formatMoney(Number.NaN)).toBe("N/A");
    expect(formatCompactPrice(1_250_000)).toBe("$1.25M");
    expect(formatCompactPrice(850_000)).toBe("$850K");
    expect(formatCompactPrice(2_450)).toBe("$2,450");
    expect(formatAcres(1234.4)).toBe("1,234 acres");
    expect(formatAcres(2.5)).toBe("2.5 acres");
  });
});
