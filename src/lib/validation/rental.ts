import { z } from "zod";

/** Shared by the application wizard (per-step validation) and the API (save + submit). */
const phone = z.string().trim().max(30).regex(/^[+()\d\s.-]*$/, "Use digits, spaces, ( ) + . or -");
const money = z.coerce.number().min(0, "Can't be negative").max(10_000_000, "That looks too high");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const LEASE_TERMS = [6, 9, 12, 15, 18, 24] as const;
export const EMPLOYMENT_STATUS = ["Employed", "Self-employed", "Student", "Retired", "Other"] as const;

export const HomeStepSchema = z.object({
  unitId: z.string().regex(/^[a-z0-9]{10,40}$/i).nullable().optional(),
  moveInDate: isoDate,
  leaseTermMonths: z.coerce.number().int().refine((v) => (LEASE_TERMS as readonly number[]).includes(v), "Choose a lease term"),
});

export const ApplicantSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(60),
  lastName: z.string().trim().min(1, "Enter your last name").max(60),
  email: z.string().trim().email("Enter a valid email").max(120),
  phone: phone.min(7, "Enter a phone number"),
  currentAddress: z.string().trim().min(5, "Enter your current address").max(200),
  monthsAtAddress: z.coerce.number().int().min(0).max(1200),
  currentRent: money,
  landlordName: z.string().trim().max(100).optional().or(z.literal("")),
  landlordPhone: phone.optional().or(z.literal("")),
  reasonForMoving: z.string().trim().max(500).optional().or(z.literal("")),
});

export const EmploymentSchema = z.object({
  status: z.enum(EMPLOYMENT_STATUS),
  employer: z.string().trim().max(120).optional().or(z.literal("")),
  position: z.string().trim().max(120).optional().or(z.literal("")),
  monthlyIncome: money,
  startDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick a date").optional(),
  otherIncome: money.optional(),
  otherIncomeSource: z.string().trim().max(120).optional().or(z.literal("")),
}).superRefine((v, ctx) => {
  if ((v.status === "Employed" || v.status === "Self-employed") && !v.employer?.trim()) {
    ctx.addIssue({ code: "custom", path: ["employer"], message: v.status === "Employed" ? "Enter your employer" : "Enter your business name" });
  }
});

export const HouseholdSchema = z.object({
  occupants: z.coerce.number().int().min(1, "At least one occupant").max(20),
  hasPets: z.boolean(),
  petDetails: z.string().trim().max(300).optional().or(z.literal("")),
  vehicles: z.coerce.number().int().min(0).max(10),
}).superRefine((v, ctx) => {
  if (v.hasPets && !v.petDetails?.trim()) ctx.addIssue({ code: "custom", path: ["petDetails"], message: "Tell us about your pets (type, breed, weight)" });
});

export const ReferenceSchema = z.object({
  name: z.string().trim().max(100),
  relationship: z.string().trim().max(60),
  contact: z.string().trim().max(120),
});
export const ReferencesSchema = z.object({ references: z.array(ReferenceSchema).max(3) });

export const ConsentSchema = z.object({
  consentScreening: z.literal(true, { message: "Your consent is required to apply" }),
  certifyAccurate: z.literal(true, { message: "Please confirm your information is accurate" }),
});

/** Partial save from any step. Each section is validated in full when present. */
export const ApplicationPatchSchema = z.object({
  home: HomeStepSchema.optional(),
  applicant: ApplicantSchema.optional(),
  employment: EmploymentSchema.optional(),
  household: HouseholdSchema.optional(),
  references: ReferencesSchema.optional(),
});
export type ApplicationPatch = z.infer<typeof ApplicationPatchSchema>;

export const SubmitSchema = ConsentSchema;

export const SignLeaseSchema = z.object({
  signatureName: z.string().trim().min(3, "Type your full legal name").max(120),
  agreeElectronic: z.literal(true, { message: "Please agree to sign electronically" }),
  agreeTerms: z.literal(true, { message: "Please confirm you've read the lease" }),
});
