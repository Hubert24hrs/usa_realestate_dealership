import { describe, expect, it } from "vitest";
import { mapResoProperty, type ResoProperty } from "@/lib/feeds/reso-map";
import { formatAddressLine } from "@/lib/format";

const base: ResoProperty = {
  ListingKey: "abc123",
  ListingId: "MLS-1001",
  StandardStatus: "Active",
  PropertyType: "Residential",
  PropertySubType: "Single Family Residence",
  ListPrice: 525_000,
  OriginalListPrice: 549_000,
  BedroomsTotal: 3,
  BathroomsFull: 2,
  BathroomsHalf: 1,
  LivingArea: 2_100,
  LotSizeAcres: 0.25,
  YearBuilt: 2004,
  StreetNumber: "123",
  StreetDirPrefix: "N",
  StreetName: "Lamar",
  StreetSuffix: "Blvd",
  City: "Austin",
  StateOrProvince: "tx",
  PostalCode: "78751-1234",
  Latitude: 30.31,
  Longitude: -97.74,
  PublicRemarks: "  Updated   kitchen and a shaded yard. ",
  ListOfficeName: "Example Realty",
  ListAgentFullName: "Pat Example",
  AssociationFee: 300,
  AssociationFeeFrequency: "Quarterly",
  OnMarketDate: "2026-10-01",
  Media: [
    { MediaKey: "m2", ResourceRecordKey: "abc123", MediaURL: "https://cdn.mls.example/2.jpg", ImageOf: "Kitchen", Order: 2, Permission: ["IDX"] },
    { MediaKey: "m1", ResourceRecordKey: "abc123", MediaURL: "https://cdn.mls.example/1.jpg", ImageOf: "Exterior (Front)", Order: 1 },
    { MediaKey: "m3", ResourceRecordKey: "abc123", MediaURL: "https://cdn.mls.example/3.jpg", ImageOf: "Bedroom", Order: 3, Permission: ["VOW"] },
    { MediaKey: "m4", ResourceRecordKey: "abc123", MediaURL: "http://insecure.example/4.jpg", Order: 4 },
  ],
};

describe("mapResoProperty", () => {
  it("maps a residential sale with normalized address, fees and photos", () => {
    const r = mapResoProperty(base, "actris");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const l = r.listing;
    expect(l.feedKey).toBe("actris:abc123");
    expect(l.mlsNumber).toBe("MLS-1001");
    expect([l.status, l.category, l.transactionType, l.propertyType]).toEqual(["ACTIVE", "RESIDENTIAL", "SALE", "SINGLE_FAMILY"]);
    expect(l.streetAddress).toBe("123 N Lamar Blvd");
    expect([l.state, l.zip]).toEqual(["TX", "78751"]);
    expect(l.baths).toBe(2.5);
    expect(l.lotSqft).toBe(10_890);
    expect(l.hoaFee).toBe(100); // $300 a quarter
    expect(l.pricePerSqft).toBe(250);
    expect(l.description).toBe("Updated kitchen and a shaded yard.");
    expect(l.attribution).toBe("Listing courtesy of Example Realty");
    // Ordered, IDX-permitted, HTTPS-only photos.
    expect(l.media.map((m) => m.providerId)).toEqual(["feed:m1", "feed:m2"]);
    expect(l.media.map((m) => m.category)).toEqual(["EXTERIOR", "KITCHEN"]);
  });

  it("maps leases, sold listings and land", () => {
    const lease = mapResoProperty({ ...base, PropertyType: "Residential Lease", ListPrice: 2_400 });
    expect(lease.ok && [lease.listing.category, lease.listing.transactionType, lease.listing.pricePerSqft]).toEqual(["RENTAL", "RENT", null]);

    const sold = mapResoProperty({ ...base, StandardStatus: "Closed", ClosePrice: 515_000, CloseDate: "2026-11-02" });
    expect(sold.ok && [sold.listing.status, sold.listing.price, sold.listing.soldPrice]).toEqual(["SOLD", 515_000, 515_000]);

    const land = mapResoProperty({ ...base, PropertyType: "Land", PropertySubType: "Unimproved Land", BedroomsTotal: null });
    expect(land.ok && [land.listing.category, land.listing.propertyType]).toEqual(["LAND", "LAND"]);

    const office = mapResoProperty({ ...base, PropertyType: "Commercial Lease", PropertySubType: "Office" });
    expect(office.ok && [office.listing.category, office.listing.transactionType, office.listing.propertyType]).toEqual(["COMMERCIAL", "LEASE", "OFFICE"]);
  });

  it("honors IDX display rules", () => {
    expect(mapResoProperty({ ...base, InternetEntireListingDisplayYN: false })).toEqual({ ok: false, reason: expect.stringMatching(/opted out/) });
    const hidden = mapResoProperty({ ...base, InternetAddressDisplayYN: false });
    expect(hidden.ok && hidden.listing.hideAddress).toBe(true);
    // Withheld addresses never format with the street (titles, emails, comps).
    if (hidden.ok) expect(formatAddressLine(hidden.listing)).toBe("Austin, TX 78751");
    expect(formatAddressLine({ streetAddress: "1 A St", unit: "2", city: "Austin", state: "TX", zip: "78701" })).toBe("1 A St 2, Austin, TX 78701");
  });

  it("rejects records it can't place on the map or price", () => {
    expect(mapResoProperty({ ...base, Latitude: null }).ok).toBe(false);
    expect(mapResoProperty({ ...base, PostalCode: "ABC" }).ok).toBe(false);
    expect(mapResoProperty({ ...base, ListPrice: null }).ok).toBe(false);
    expect(mapResoProperty({ ...base, StandardStatus: "Incomplete" })).toMatchObject({ ok: true, listing: { status: "OFF_MARKET" } });
    expect(mapResoProperty({ ...base, StandardStatus: "Mystery" }).ok).toBe(false);
  });
});
