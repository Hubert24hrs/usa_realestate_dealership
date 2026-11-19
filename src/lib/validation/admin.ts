import { z } from "zod";

/** Admin/CMS payloads, shared by the browser (preview + forms) and the API. */
const optInt = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(min).max(max).nullable()).optional();
const optFloat = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(min).max(max).nullable()).optional();
const ID = z.string().regex(/^[a-z0-9]{10,40}$/i);

export const LISTING_STATUSES = ["DRAFT", "ACTIVE", "COMING_SOON", "PENDING", "SOLD", "RENTED", "OFF_MARKET"] as const;
export const CATEGORIES = ["RESIDENTIAL", "RENTAL", "COMMERCIAL", "LAND"] as const;
export const TRANSACTIONS = ["SALE", "RENT", "LEASE"] as const;
export const PROPERTY_TYPES = ["SINGLE_FAMILY", "CONDO", "TOWNHOUSE", "MULTI_FAMILY", "MANUFACTURED", "APARTMENT", "LAND", "FARM_RANCH", "OFFICE", "RETAIL", "INDUSTRIAL", "MIXED_USE", "HOSPITALITY"] as const;
export const FLAG_FIELDS = ["isFeatured", "isLuxury", "isNewConstruction", "hideAddress", "hasPool", "isWaterfront", "hasView", "petsAllowed", "has3dTour", "hasVideo"] as const;

export const AdminListingUpdateSchema = z
  .object({
    headline: z.string().trim().max(120).nullable().optional(),
    description: z.string().trim().min(20, "Write at least a sentence or two").max(10_000).optional(),
    price: z.coerce.number().int().min(100).max(1_000_000_000).optional(),
    status: z.enum(LISTING_STATUSES).optional(),
    beds: optInt(0, 50),
    baths: optFloat(0, 50),
    sqft: optInt(0, 5_000_000),
    lotSqft: optInt(0, 500_000_000),
    yearBuilt: optInt(1700, new Date().getFullYear() + 3),
    hoaFee: optInt(0, 100_000),
    agentId: ID.nullable().optional(),
    // partialRecord: any subset of flags (z.record with enum keys would require every key in Zod 4).
    flags: z.partialRecord(z.enum(FLAG_FIELDS), z.boolean()).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");

export const AdminListingCreateSchema = z.object({
  category: z.enum(CATEGORIES),
  transactionType: z.enum(TRANSACTIONS),
  propertyType: z.enum(PROPERTY_TYPES),
  streetAddress: z.string().trim().min(3).max(120),
  unit: z.string().trim().max(20).optional().or(z.literal("")),
  citySlug: z.string().regex(/^[a-z0-9-]{2,60}$/, "Choose a city"),
  zip: z.string().trim().regex(/^\d{5}$/, "5-digit ZIP"),
  price: z.coerce.number().int().min(100).max(1_000_000_000),
  description: z.string().trim().min(20).max(10_000),
});

/** One CSV row. Column names are lower_snake_case; see the template on the import page. */
export const ImportRowSchema = z.object({
  street_address: z.string().trim().min(3).max(120),
  unit: z.string().trim().max(20).optional().default(""),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/, "2-letter state").transform((s) => s.toUpperCase()),
  zip: z.string().trim().regex(/^\d{5}$/, "5-digit ZIP"),
  category: z.preprocess((v) => String(v ?? "").trim().toUpperCase() || "RESIDENTIAL", z.enum(CATEGORIES)),
  transaction_type: z.preprocess((v) => String(v ?? "").trim().toUpperCase() || "SALE", z.enum(TRANSACTIONS)),
  property_type: z.preprocess((v) => String(v ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_") || "SINGLE_FAMILY", z.enum(PROPERTY_TYPES)),
  price: z.coerce.number().int().min(100).max(1_000_000_000),
  beds: optInt(0, 50),
  baths: optFloat(0, 50),
  sqft: optInt(0, 5_000_000),
  lot_sqft: optInt(0, 500_000_000),
  year_built: optInt(1700, new Date().getFullYear() + 3),
  headline: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().min(20, "Description is too short").max(10_000),
  mls_number: z.string().trim().max(40).optional().default(""),
});
export type ImportRow = z.infer<typeof ImportRowSchema>;
export const IMPORT_COLUMNS = Object.keys(ImportRowSchema.shape);

export const PostSchema = z.object({
  title: z.string().trim().min(5).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(120),
  type: z.enum(["GUIDE", "LEARN", "NEWS", "BLOG"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  excerpt: z.string().trim().max(300).optional().or(z.literal("")),
  body: z.string().trim().min(20, "Write the article").max(60_000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10),
  citySlug: z.string().regex(/^[a-z0-9-]{2,60}$/).optional().or(z.literal("")),
  coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Hex color like #3b3fa8").optional().or(z.literal("")),
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(170).optional().or(z.literal("")),
});
export type PostPayload = z.infer<typeof PostSchema>;

export const PlaceUpdateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("city"),
    id: ID,
    description: z.string().trim().max(4_000).optional(),
    seoTitle: z.string().trim().max(70).optional(),
    seoDescription: z.string().trim().max(170).optional(),
    heroColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
  }),
  z.object({
    kind: z.literal("neighborhood"),
    id: ID,
    description: z.string().trim().max(4_000).optional(),
    highlights: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
    seoTitle: z.string().trim().max(70).optional(),
    seoDescription: z.string().trim().max(170).optional(),
  }),
]);

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const ROUTING_STRATEGIES = [
  ["weighted-round-robin", "Weighted round-robin (paid plans get priority)"],
  ["round-robin", "Plain round-robin (equal turns)"],
] as const;

/** One setting per request; keys mirror SiteSetting rows. */
export const SettingUpdateSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("compliance.idxDisclaimer"), value: text(20, 2_000) }),
  z.object({ key: z.literal("compliance.listingDisclaimer"), value: text(10, 1_000) }),
  z.object({ key: z.literal("compliance.fairHousing"), value: text(20, 2_000) }),
  z.object({ key: z.literal("site.demoBanner"), value: text(10, 300) }),
  z.object({
    key: z.literal("compliance.brokerage"),
    value: z.object({
      name: text(2, 120),
      licenses: z.array(text(2, 80)).min(1).max(20),
      address: z.string().trim().max(200),
      phone: z.string().trim().max(30),
    }),
  }),
  z.object({
    key: z.literal("leads.routing"),
    value: z.object({
      strategy: z.enum(["weighted-round-robin", "round-robin"]),
      preferListingAgent: z.boolean(),
      slaMinutes: z.number().int().min(1).max(1_440),
    }),
  }),
  z.object({ key: z.literal("state.notice"), code: z.string().regex(/^[A-Z]{2}$/), value: z.string().trim().max(2_000) }),
]);
export type SettingUpdate = z.infer<typeof SettingUpdateSchema>;
