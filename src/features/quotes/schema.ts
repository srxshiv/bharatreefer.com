import { z } from "zod";
import type { FleetConfig } from "@/config/fleet";
import { MATERIAL_IDS } from "@/config/materials";
import { isRegion } from "@/data/india-locations";
import { isPromoCode, normalisePromoCode } from "@/features/team/promo-code";
import { dateInIndia, isIsoDate } from "@/lib/dates";
import { formatKg } from "@/lib/format";
import { normaliseIndianMobile } from "@/lib/phone";

/** How far ahead a pickup can be requested. */
const MAX_PICKUP_DAYS_AHEAD = 365;

export const QUOTE_FIELDS = [
  "originState",
  "originCity",
  "destinationState",
  "destinationCity",
  "pickupDate",
  "material",
  "quantityKg",
  "notes",
  "contactName",
  "phone",
  "email",
  "promoCode",
] as const;

export type QuoteField = (typeof QUOTE_FIELDS)[number];

/** Raw form values, exactly as typed. */
export type QuoteFormValues = Record<QuoteField, string>;

export type QuoteFieldErrors = Partial<Record<QuoteField, string>>;

export const EMPTY_QUOTE_FORM: QuoteFormValues = {
  originState: "",
  originCity: "",
  destinationState: "",
  destinationCity: "",
  pickupDate: "",
  material: "CHILLED",
  quantityKg: "",
  notes: "",
  contactName: "",
  phone: "",
  email: "",
  promoCode: "",
};

const state = (message: string) => z.string().refine(isRegion, message);

const city = (message: string) =>
  z
    .string()
    .trim()
    .min(2, message)
    .max(80, "Keep the city name under 80 characters")
    .regex(/^[\p{L}\p{M}0-9 .,'()&/-]+$/u, "Use only letters, numbers and basic punctuation");

const email = z.email();

/** The quote form's fields from a submission, each as typed (empty when missing). */
export function readQuoteForm(formData: FormData): QuoteFormValues {
  const values = {} as QuoteFormValues;
  for (const field of QUOTE_FIELDS) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

/** Reads the weight field, tolerating "12,500" and "12 500". Returns null if it is not a whole number. */
export function parseQuantityKg(raw: string): number | null {
  const digits = raw.replace(/[,\s]/g, "");
  return /^\d{1,9}$/.test(digits) ? Number(digits) : null;
}

/** The quote form's validation. Built per request because the weight limits are editable. */
export function createQuoteRequestSchema(limits: Pick<FleetConfig, "minQuantityKg" | "maxQuantityKg">) {
  return z.object({
    originState: state("Select the loading state"),
    originCity: city("Enter the loading city or town"),
    destinationState: state("Select the unloading state"),
    destinationCity: city("Enter the unloading city or town"),

    pickupDate: z
      .string()
      .trim()
      .refine((value) => value === "" || isIsoDate(value), "Enter a valid date")
      .refine((value) => value === "" || value >= dateInIndia(), "Pickup date cannot be in the past")
      .refine(
        (value) => value === "" || value <= dateInIndia(MAX_PICKUP_DAYS_AHEAD),
        "Pickup date must be within the next 12 months",
      )
      .transform((value) => (value === "" ? undefined : value)),

    material: z.enum(MATERIAL_IDS, { error: "Choose a temperature band" }),

    quantityKg: z.string().transform((raw, ctx) => {
      const quantity = parseQuantityKg(raw);
      if (quantity === null) {
        ctx.issues.push({ code: "custom", message: "Enter the weight in kilograms", input: raw });
        return z.NEVER;
      }
      if (quantity < limits.minQuantityKg || quantity > limits.maxQuantityKg) {
        ctx.issues.push({
          code: "custom",
          message: `Enter a weight between ${formatKg(limits.minQuantityKg)} and ${formatKg(limits.maxQuantityKg)}`,
          input: raw,
        });
        return z.NEVER;
      }
      return quantity;
    }),

    notes: z
      .string()
      // Browsers submit textarea line breaks as CRLF; store plain newlines.
      .transform((value) => value.replace(/\r\n?/g, "\n").trim())
      .pipe(z.string().max(1000, "Keep the notes under 1,000 characters"))
      .transform((value) => (value === "" ? undefined : value)),

    contactName: z
      .string()
      .trim()
      .min(2, "Enter your name")
      .max(80, "Keep the name under 80 characters"),

    phone: z.string().transform((raw, ctx) => {
      const normalised = normaliseIndianMobile(raw);
      if (!normalised) {
        ctx.issues.push({
          code: "custom",
          message: "Enter a 10-digit Indian mobile number",
          input: raw,
        });
        return z.NEVER;
      }
      return normalised;
    }),

    email: z
      .string()
      .trim()
      .max(254, "Keep the email under 254 characters")
      .refine(
        (value) => value === "" || email.safeParse(value).success,
        "Enter a valid email address, or leave it empty",
      )
      .transform((value) => (value === "" ? undefined : value.toLowerCase())),

    // Only the shape is checked here. Whether a team member has the code is checked on the
    // server, which then credits the request to them.
    promoCode: z
      .string()
      .transform(normalisePromoCode)
      .refine((value) => value === "" || isPromoCode(value), "Promo codes are 4 or 5 letters or digits")
      .transform((value) => (value === "" ? undefined : value)),
  });
}

/** Shown when no team member that can still sign in has the code. */
export const UNKNOWN_PROMO_CODE = "We do not recognise this code. Check it, or leave it empty";

export type QuoteRequestSchema = ReturnType<typeof createQuoteRequestSchema>;

/** A validated, normalised quote request. */
export type QuoteRequestInput = z.infer<QuoteRequestSchema>;

/** First validation message per field, ready to show next to the inputs. */
export function toFieldErrors(error: z.ZodError): QuoteFieldErrors {
  const errors: QuoteFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as QuoteField | undefined;
    if (field && !(field in errors)) errors[field] = issue.message;
  }
  return errors;
}
