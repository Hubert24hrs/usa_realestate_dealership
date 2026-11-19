import { z } from "zod";
import { checkFairHousing } from "@/lib/fair-housing";

/** For-sale-by-owner / for-rent-by-owner posting, shared by the wizard and the API. */
export const FSBO_PROPERTY_TYPES = [
  ["SINGLE_FAMILY", "House"],
  ["TOWNHOUSE", "Townhouse"],
  ["CONDO", "Condo"],
  ["MULTI_FAMILY", "Multi-family (2–4 units)"],
  ["MANUFACTURED", "Manufactured home"],
] as const;
export const FSBO_FEATURES = [
  ["hasAC", "Central air"],
  ["hasFireplace", "Fireplace"],
  ["hasYard", "Yard"],
  ["hasPool", "Pool"],
  ["hasBasement", "Basement"],
  ["hasView", "View"],
  ["isWaterfront", "Waterfront"],
] as const;
export const PHOTO_CATEGORIES = [
  ["EXTERIOR", "Exterior"],
  ["LIVING_ROOM", "Living room"],
  ["KITCHEN", "Kitchen"],
  ["DINING_ROOM", "Dining room"],
  ["PRIMARY_BEDROOM", "Primary bedroom"],
  ["BEDROOM", "Bedroom"],
  ["BATHROOM", "Bathroom"],
  ["BACKYARD", "Backyard"],
  ["VIEW", "View"],
  ["AERIAL", "Aerial"],
  ["FLOOR_PLAN", "Floor plan"],
  ["OTHER", "Other"],
] as const;

type Code<T extends readonly (readonly [string, string])[]> = T[number][0];
const codes = <T extends readonly (readonly [string, string])[]>(list: T) => list.map(([c]) => c) as unknown as [Code<T>, ...Code<T>[]];
const ID = z.string().regex(/^[a-z0-9]{10,40}$/i);
const year = new Date().getFullYear();
const optInt = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(min).max(max).optional());

export const BasicsSchema = z.object({
  mode: z.enum(["sale", "rent"]),
  propertyType: z.enum(codes(FSBO_PROPERTY_TYPES)),
});

export const LocationSchema = z.object({
  streetAddress: z.string().trim().min(5, "Enter the street address").max(120).regex(/^\d+[A-Za-z]?\s+\S+/, "Start with the street number, e.g. 123 Main St"),
  unit: z.string().trim().max(20).optional().or(z.literal("")),
  citySlug: z.string().regex(/^[a-z0-9-]{2,60}$/, "Choose a city"),
  zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
  hideAddress: z.boolean(),
});

export const DetailsSchema = z.object({
  beds: z.coerce.number().int().min(0).max(20),
  baths: z.coerce.number().min(0).max(20).refine((v) => Number.isInteger(v * 2), "Use whole or half baths"),
  sqft: z.coerce.number().int().min(200, "Enter the finished square footage").max(30_000),
  lotSqft: optInt(0, 50_000_000),
  yearBuilt: optInt(1800, year + 2),
  stories: optInt(1, 10),
  garageSpaces: z.coerce.number().int().min(0).max(10),
  hoaFee: optInt(0, 20_000),
  features: z.array(z.enum(codes(FSBO_FEATURES))).max(10),
});

export const RentTermsSchema = z.object({
  availableDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an available date"),
  leaseTermMonths: z.coerce.number().int().refine((v) => [6, 9, 12, 18, 24].includes(v), "Choose a lease term"),
  securityDeposit: z.coerce.number().int().min(0).max(100_000),
  catsAllowed: z.boolean(),
  dogsAllowed: z.boolean(),
  furnished: z.boolean(),
});

export const PhotoSchema = z.object({
  uploadId: ID,
  url: z.string().max(500),
  category: z.enum(codes(PHOTO_CATEGORIES)),
  alt: z.string().trim().min(3, "Describe the photo").max(160),
});
export const PhotosSchema = z.object({ photos: z.array(PhotoSchema).min(1, "Add at least one photo").max(30, "Up to 30 photos") });

const fairHousing = (v: { headline: string; description: string }, ctx: z.RefinementCtx) => {
  const blocked = checkFairHousing(`${v.headline}\n${v.description}`).filter((f) => f.severity === "block");
  for (const f of blocked) ctx.addIssue({ code: "custom", path: ["description"], message: `Remove “${f.phrase}”: ${f.reason}` });
};

export const ListingCopySchema = z
  .object({
    headline: z.string().trim().min(10, "Add a short headline (10+ characters)").max(90),
    description: z.string().trim().min(80, "Write at least a few sentences (80+ characters)").max(5_000),
    price: z.coerce.number().int().min(100).max(100_000_000),
  })
  .superRefine(fairHousing);

export const FsboSchema = BasicsSchema.extend(LocationSchema.shape)
  .extend(DetailsSchema.shape)
  .extend({
    rent: RentTermsSchema.optional(),
    headline: ListingCopySchema.shape.headline,
    description: ListingCopySchema.shape.description,
    price: ListingCopySchema.shape.price,
    photos: PhotosSchema.shape.photos,
    confirmOwner: z.literal(true, { message: "Please confirm you're the owner or authorized to list" }),
  })
  .superRefine((v, ctx) => {
    fairHousing(v, ctx);
    if (v.mode === "rent" && !v.rent) ctx.addIssue({ code: "custom", path: ["rent"], message: "Add the rental terms" });
    if (v.mode === "rent" && v.price > 100_000) ctx.addIssue({ code: "custom", path: ["price"], message: "Enter the monthly rent" });
    if (v.mode === "sale" && v.price < 10_000) ctx.addIssue({ code: "custom", path: ["price"], message: "Enter the asking price" });
  });
export type FsboPayload = z.infer<typeof FsboSchema>;
