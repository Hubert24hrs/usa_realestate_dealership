import { describe, expect, it } from "vitest";
import { dayOf, monthStart, nextRentDue, periodKey } from "@/lib/rent-periods";

const utc = (s: string) => new Date(`${s}T00:00:00Z`);
const lease = (start: string, end: string, monthlyRent = 2_000) => ({ status: "ACTIVE" as const, startDate: utc(start), endDate: utc(end), monthlyRent });

describe("period helpers", () => {
  it("reads the intended calendar day for UTC-midnight, noon-UTC and local-midnight storage", () => {
    expect(dayOf(new Date("2026-12-29T00:00:00Z")).toISOString()).toBe("2026-12-29T00:00:00.000Z");
    expect(dayOf(new Date("2026-12-29T12:00:00Z")).toISOString()).toBe("2026-12-29T00:00:00.000Z");
    // Local midnight in UTC−6 (e.g. Austin) is 06:00 UTC on the same day.
    expect(dayOf(new Date("2026-12-29T06:00:00Z")).toISOString()).toBe("2026-12-29T00:00:00.000Z");
    // Local midnight in UTC+5 is 19:00 UTC the previous day.
    expect(dayOf(new Date("2026-12-28T19:00:00Z")).toISOString()).toBe("2026-12-29T00:00:00.000Z");
  });

  it("keys periods by month", () => {
    expect(periodKey(utc("2027-03-17"))).toBe("2027-03");
    expect(monthStart(utc("2027-03-17")).toISOString()).toBe("2027-03-01T00:00:00.000Z");
  });
});

describe("nextRentDue", () => {
  it("prorates a partial first month and makes it due on move-in day", () => {
    const due = nextRentDue(lease("2026-12-29", "2027-12-28", 2_000), [], utc("2026-12-20"))!;
    expect(periodKey(due.periodStart)).toBe("2026-12");
    expect(due.prorated).toBe(true);
    expect(due.amountCents).toBe(Math.round((2_000 * 100 * 3) / 31)); // Dec 29–31
    expect(due.dueDate.toISOString()).toBe("2026-12-29T00:00:00.000Z");
    expect(due.overdue).toBe(false);
  });

  it("moves to the next unpaid month at full rent", () => {
    const due = nextRentDue(lease("2026-12-29", "2027-12-28"), [{ periodStart: utc("2026-12-01"), status: "PAID" }], utc("2026-12-30"))!;
    expect(periodKey(due.periodStart)).toBe("2027-01");
    expect(due.amountCents).toBe(200_000);
    expect(due.prorated).toBe(false);
  });

  it("flags rent as overdue five days after it was due", () => {
    const l = lease("2026-01-01", "2026-12-31");
    expect(nextRentDue(l, [], utc("2026-01-05"))!.overdue).toBe(false);
    expect(nextRentDue(l, [], utc("2026-01-07"))!.overdue).toBe(true);
  });

  it("ignores failed payments and only allows paying one month ahead", () => {
    const l = lease("2026-01-01", "2026-12-31");
    expect(periodKey(nextRentDue(l, [{ periodStart: utc("2026-01-01"), status: "FAILED" }], utc("2026-01-02"))!.periodStart)).toBe("2026-01");
    const paidAhead = ["2026-01-01", "2026-02-01"].map((d) => ({ periodStart: utc(d), status: "PAID" as const }));
    expect(nextRentDue(l, paidAhead, utc("2026-01-10"))).toBeNull();
  });

  it("prorates the last month and returns null once the lease is fully paid", () => {
    const l = lease("2026-01-01", "2026-03-15");
    const paid = [{ periodStart: utc("2026-01-01"), status: "PAID" as const }, { periodStart: utc("2026-02-01"), status: "PAID" as const }];
    const last = nextRentDue(l, paid, utc("2026-03-01"))!;
    expect(last.amountCents).toBe(Math.round((2_000 * 100 * 15) / 31));
    expect(nextRentDue(l, [...paid, { periodStart: utc("2026-03-01"), status: "PAID" }], utc("2026-03-10"))).toBeNull();
  });

  it("returns nothing for leases that aren't active", () => {
    expect(nextRentDue({ ...lease("2026-01-01", "2026-12-31"), status: "PENDING_SIGNATURE" }, [], utc("2026-01-02"))).toBeNull();
  });
});
