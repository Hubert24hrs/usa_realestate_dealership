import { z } from "zod";

const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+()\d\s.-]*$/, "Use digits, spaces, ( ) + . or -")
  .optional()
  .or(z.literal(""));

export const LeadBaseSchema = z.object({
  listingId: z.string().regex(/^[a-z0-9]{10,40}$/i, "Invalid listing").optional(),
  agentId: z.string().regex(/^[a-z0-9]{10,40}$/i, "Invalid agent").optional(),
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
  phone,
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  consent: z.literal(true, { message: "Please agree to be contacted" }),
  /** Market for routing non-listing leads (home value, seller consult, pre-approval). */
  citySlug: z.string().regex(/^[a-z0-9-]{2,60}$/).optional(),
  /** Honeypot: real users never fill this hidden field. */
  website: z.string().max(0).optional().or(z.literal("")),
  source: z.string().max(200).optional(),
});

export const LeadSchema = z.discriminatedUnion("type", [
  LeadBaseSchema.extend({
    type: z.literal("TOUR"),
    tourType: z.enum(["IN_PERSON", "VIDEO"]),
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    preferredTime: z.string().min(1, "Pick a time").max(40),
  }),
  LeadBaseSchema.extend({ type: z.literal("REQUEST_INFO") }),
  LeadBaseSchema.extend({ type: z.literal("ASK_AGENT"), message: z.string().trim().min(5, "Add your question").max(2000) }),
  LeadBaseSchema.extend({
    type: z.literal("OFFER_INTEREST"),
    offerAmount: z.coerce.number().int().positive().max(1_000_000_000),
    financing: z.enum(["Cash", "Conventional", "FHA", "VA", "USDA", "Other"]),
    preApproved: z.enum(["yes", "no", "in-progress"]),
    timeline: z.enum(["ASAP", "30 days", "60 days", "90+ days"]),
  }),
  LeadBaseSchema.extend({ type: z.literal("CONTACT_AGENT") }),
  LeadBaseSchema.extend({ type: z.literal("RENTAL_INQUIRY"), moveInDate: z.string().max(20).optional() }),
  LeadBaseSchema.extend({ type: z.literal("OM_REQUEST"), company: z.string().max(120).optional() }),
  LeadBaseSchema.extend({ type: z.literal("PREAPPROVAL"), annualIncome: z.coerce.number().nonnegative().max(100_000_000), purchasePrice: z.coerce.number().nonnegative().max(1_000_000_000), downPayment: z.coerce.number().nonnegative().max(1_000_000_000), creditRange: z.enum(["740+", "680-739", "620-679", "Below 620", "Not sure"]) }),
  LeadBaseSchema.extend({ type: z.literal("SELLER_CONSULT"), address: z.string().max(200).optional(), timeline: z.string().max(40).optional() }),
  LeadBaseSchema.extend({ type: z.literal("HOME_VALUE"), address: z.string().max(200).optional(), estimate: z.coerce.number().optional() }),
]);

export type LeadPayload = z.infer<typeof LeadSchema>;

export const TCPA_TEXT =
  "By submitting, you agree that CITI VIEW and the agent or owner you contact may call, text or email you about real estate, including by automated means. Consent is not a condition of purchase. Message and data rates may apply.";
