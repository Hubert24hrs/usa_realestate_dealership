import { describe, expect, it } from "vitest";
import { defaultFilters, filtersToQuery, parseFilters } from "@/lib/search/filters";
import { buildSearchHref } from "@/lib/search/verticals";
import { AdminListingUpdateSchema, ImportRowSchema, PostSchema, SettingUpdateSchema } from "@/lib/validation/admin";

describe("search filters", () => {
  it("parses URL parameters and round-trips them through the query string", () => {
    const f = parseFilters({ beds: "3", baths: "2", price: "400000-750000", type: "CONDO,TOWNHOUSE", sort: "price-asc" }, { mode: "buy", place: "austin-tx" });
    expect(f.bedsMin).toBe(3);
    expect(f.bathsMin).toBe(2);
    expect(f.price).toEqual({ min: 400_000, max: 750_000 });
    expect(f.homeTypes).toEqual(["CONDO", "TOWNHOUSE"]);
    expect(f.sort).toBe("price-asc");
    const again = parseFilters(Object.fromEntries(filtersToQuery(f)), { mode: "buy", place: "austin-tx" });
    expect(again).toEqual(f);
  });

  it("drops invalid parameters instead of failing the search", () => {
    const f = parseFilters({ beds: "lots", price: "abc", sort: "nope", page: "-4", baths: "2" }, { mode: "rent" });
    expect(f.mode).toBe("rent");
    expect(f.bathsMin).toBe(2);
    expect(f.bedsMin).toBeUndefined();
    expect(f.sort).not.toBe("nope");
  });

  it("builds canonical SEO paths for a place", () => {
    const href = buildSearchHref({ ...defaultFilters("buy"), place: "austin-tx" });
    expect(href.startsWith("/homes-for-sale/austin-tx")).toBe(true);
    expect(buildSearchHref({ ...defaultFilters("rent"), place: "denver-co" }).startsWith("/apartments-for-rent/denver-co")).toBe(true);
  });
});

describe("admin schemas", () => {
  it("accepts a partial flags update (regression: one flag at a time from the Feature button)", () => {
    expect(AdminListingUpdateSchema.safeParse({ flags: { isFeatured: true } }).success).toBe(true);
    expect(AdminListingUpdateSchema.safeParse({ flags: { notAFlag: true } }).success).toBe(false);
    expect(AdminListingUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("normalizes CSV rows", () => {
    const row = ImportRowSchema.parse({ street_address: " 12 Main St ", city: "Austin", state: "tx", zip: "78701", property_type: "single family", price: "389000", beds: "", description: "Two-bedroom home with a garden and a garage." });
    expect(row.state).toBe("TX");
    expect(row.property_type).toBe("SINGLE_FAMILY");
    expect(row.category).toBe("RESIDENTIAL");
    expect(row.transaction_type).toBe("SALE");
    expect(row.beds).toBeNull();
    expect(row.street_address).toBe("12 Main St");
  });

  it("rejects bad CSV rows with a field-specific message", () => {
    const r = ImportRowSchema.safeParse({ street_address: "1 A St", city: "Austin", state: "TX", zip: "7870", price: "100000", description: "Long enough description text here." });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.path).toEqual(["zip"]);
  });

  it("requires URL-safe article slugs and hex cover colors", () => {
    const base = { title: "A useful guide", slug: "a-useful-guide", type: "GUIDE", status: "DRAFT", body: "Body text that is long enough.", tags: [] };
    expect(PostSchema.safeParse(base).success).toBe(true);
    expect(PostSchema.safeParse({ ...base, slug: "Not A Slug" }).success).toBe(false);
    expect(PostSchema.safeParse({ ...base, coverColor: "red" }).success).toBe(false);
  });

  it("validates each site setting by key", () => {
    expect(SettingUpdateSchema.safeParse({ key: "leads.routing", value: { strategy: "round-robin", preferListingAgent: true, slaMinutes: 15 } }).success).toBe(true);
    expect(SettingUpdateSchema.safeParse({ key: "leads.routing", value: { strategy: "lottery", preferListingAgent: true, slaMinutes: 15 } }).success).toBe(false);
    expect(SettingUpdateSchema.safeParse({ key: "site.demoBanner", value: "short" }).success).toBe(false);
    expect(SettingUpdateSchema.safeParse({ key: "state.notice", code: "tx", value: "" }).success).toBe(false);
  });
});
