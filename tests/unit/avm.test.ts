import { describe, expect, it } from "vitest";
import { haversineMi, valueHome, type Comp, type Subject } from "@/lib/avm";

const NOW = new Date("2026-11-01T12:00:00Z");
const monthsAgo = (m: number) => new Date(NOW.getTime() - m * 30.44 * 86_400_000);

let n = 0;
function comp(overrides: Partial<Comp> = {}): Comp {
  n++;
  return {
    id: `c${n}`,
    slug: `comp-${n}`,
    address: `${n} Test St`,
    status: "SOLD",
    price: 450_000,
    date: monthsAgo(2),
    beds: 3,
    baths: 2,
    sqft: 1_800,
    yearBuilt: 2000,
    propertyType: "SINGLE_FAMILY",
    zip: "78704",
    lat: 30.25,
    lng: -97.75,
    hasPool: false,
    garageSpaces: 2,
    ...overrides,
  };
}

const subject: Subject = { propertyType: "SINGLE_FAMILY", beds: 3, baths: 2, sqft: 1_800, yearBuilt: 2000, zip: "78704", lat: 30.25, lng: -97.75, hasPool: false, garageSpaces: 2, condition: "average" };
const goodComps = () => [comp(), comp({ price: 455_000 }), comp({ price: 445_000, lat: 30.26 }), comp({ price: 460_000, sqft: 1_850 }), comp({ price: 440_000, sqft: 1_750 }), comp({ price: 452_000 })];

describe("haversineMi", () => {
  it("measures great-circle distance in miles", () => {
    // Austin to Dallas is roughly 182 miles as the crow flies.
    expect(haversineMi(30.2672, -97.7431, 32.7767, -96.797)).toBeGreaterThan(175);
    expect(haversineMi(30.2672, -97.7431, 32.7767, -96.797)).toBeLessThan(190);
    expect(haversineMi(30, -97, 30, -97)).toBe(0);
  });
});

describe("valueHome", () => {
  it("lands near closely matched sales with high confidence", () => {
    const v = valueHome(subject, goodComps(), 250, NOW)!;
    expect(v.value).toBeGreaterThan(420_000);
    expect(v.value).toBeLessThan(480_000);
    expect(v.confidence).toBe("high");
    expect(v.low).toBeLessThan(v.value);
    expect(v.high).toBeGreaterThan(v.value);
  });

  it("keeps the range between 4% and 20% of the value", () => {
    for (const comps of [goodComps(), [comp({ price: 300_000 }), comp({ price: 650_000 })], []]) {
      const v = valueHome(subject, comps, 250, NOW)!;
      const spread = (v.high - v.value) / v.value;
      expect(spread).toBeGreaterThanOrEqual(0.035);
      expect(spread).toBeLessThanOrEqual(0.205);
    }
  });

  it("falls back to the market price per square foot with low confidence when there are no comps", () => {
    const v = valueHome(subject, [], 250, NOW)!;
    expect(v.compsUsed).toBe(0);
    expect(v.confidence).toBe("low");
    expect(v.value).toBe(450_000); // 1,800 sq ft × $250
  });

  it("returns null without comps or market data, or for a zero-size home", () => {
    expect(valueHome(subject, [], 0, NOW)).toBeNull();
    expect(valueHome({ ...subject, sqft: 0 }, goodComps(), 250, NOW)).toBeNull();
  });

  it("values larger and better-kept homes higher", () => {
    const base = valueHome(subject, goodComps(), 250, NOW)!.value;
    expect(valueHome({ ...subject, sqft: 2_200 }, goodComps(), 250, NOW)!.value).toBeGreaterThan(base);
    expect(valueHome({ ...subject, condition: "renovated" }, goodComps(), 250, NOW)!.value).toBeGreaterThan(base);
    expect(valueHome({ ...subject, condition: "needs-work" }, goodComps(), 250, NOW)!.value).toBeLessThan(base);
  });

  it("ignores comps of a different property group or wildly different size", () => {
    const v = valueHome(subject, [comp({ propertyType: "CONDO", price: 200_000 }), comp({ sqft: 5_000, price: 1_500_000 })], 250, NOW)!;
    expect(v.compsUsed).toBe(0);
  });
});
