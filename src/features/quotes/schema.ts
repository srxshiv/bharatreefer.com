import { z } from "zod";
import { MAX_QUANTITY_KG, MIN_QUANTITY_KG } from "@/config/fleet";
import { MATERIAL_IDS } from "@/config/materials";
import { isRegion } from "@/data/india-locations";
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
  "material",
  "quantityKg",
  "contactName",
  "phone",
  "email",
  "pickupDate",
  "notes",
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
  material: "CHILLED",
  quantityKg: "",
  contactName: "",
  phone: "",
  email: "",
  pickupDate: "",
  notes: "",
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

/** Reads the weight field, tolerating "12,500" and "12 500". Returns null if it is not a whole number. */
export function parseQuantityKg(raw: string): number | null {
  const digits = raw.replace(/[,\s]/g, "");
  return /^\d{1,9}$/.test(digits) ? Number(digits) : null;
}

export const quoteRequestSchema = z.object({
  originState: state("Select the loading state"),
  originCity: city("Enter the loading city or town"),
  destinationState: state("Select the unloading state"),
  destinationCity: city("Enter the unloading city or town"),

  material: z.enum(MATERIAL_IDS, { error: "Choose a temperature band" }),

  quantityKg: z.string().transform((raw, ctx) => {
    const quantity = parseQuantityKg(raw);
    if (quantity === null) {
      ctx.issues.push({ code: "custom", message: "Enter the weight in kilograms", input: raw });
      return z.NEVER;
    }
    if (quantity < MIN_QUANTITY_KG || quantity > MAX_QUANTITY_KG) {
      ctx.issues.push({
        code: "custom",
        message: `Enter a weight between ${formatKg(MIN_QUANTITY_KG)} and ${formatKg(MAX_QUANTITY_KG)}`,
        input: raw,
      });
      return z.NEVER;
    }
    return quantity;
  }),

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

  notes: z
    .string()
    // Browsers submit textarea line breaks as CRLF; store plain newlines.
    .transform((value) => value.replace(/\r\n?/g, "\n").trim())
    .pipe(z.string().max(1000, "Keep the notes under 1,000 characters"))
    .transform((value) => (value === "" ? undefined : value)),
});

/** A validated, normalised quote request. */
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

/** First validation message per field, ready to show next to the inputs. */
export function toFieldErrors(error: z.ZodError): QuoteFieldErrors {
  const errors: QuoteFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as QuoteField | undefined;
    if (field && !(field in errors)) errors[field] = issue.message;
  }
  return errors;
}
