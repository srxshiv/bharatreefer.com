import { z } from "zod";
import { MATERIAL_IDS, type MaterialId, type TemperatureBandInfo } from "@/config/materials";
import type { BusinessInfo } from "@/config/site";
import { DAY_NAMES, isClockTime, isDayName } from "@/lib/hours";
import { normaliseIndianMobile } from "@/lib/phone";
import type { CopyInput, FleetInput } from "./data";
import type { Faq, Step } from "./types";

export const MAX_TRUCK_SIZES = 12;
export const MAX_STEPS = 6;
export const MAX_FAQS = 12;
export const MAX_EXAMPLES = 8;

/** Reads rows submitted as `prefix[0].field`, `prefix[1].field`, ... in index order. */
export function readRows(formData: FormData, prefix: string): Record<string, string>[] {
  const pattern = new RegExp(`^${prefix}\\[(\\d+)\\]\\.(\\w+)$`);
  const rows = new Map<number, Record<string, string>>();
  for (const [key, value] of formData.entries()) {
    const match = key.match(pattern);
    if (!match || typeof value !== "string") continue;
    const index = Number(match[1]);
    const row = rows.get(index) ?? {};
    row[match[2]] = value;
    rows.set(index, row);
  }
  return [...rows.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
}

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);

const mobile = z.string().transform((raw, ctx) => {
  const normalised = normaliseIndianMobile(raw);
  if (!normalised) {
    ctx.issues.push({ code: "custom", message: "Enter a 10-digit Indian mobile number", input: raw });
    return z.NEVER;
  }
  return normalised;
});

const optionalMobile = z.string().transform((raw, ctx) => {
  if (raw.trim() === "") return null;
  const normalised = normaliseIndianMobile(raw);
  if (!normalised) {
    ctx.issues.push({ code: "custom", message: "Enter a 10-digit Indian mobile number", input: raw });
    return z.NEVER;
  }
  return normalised;
});

const emailAddress = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => (value === "" ? null : value))
  .pipe(z.email("Enter a valid email address").nullable());

const clockTime = z.string().refine(isClockTime, "Enter a time as HH:MM");

export const businessSchema = z
  .object({
    name: text(60, 2),
    tagline: text(80, 0),
    phone: mobile,
    whatsapp: optionalMobile,
    email: emailAddress,
    alertEmail: optionalEmail,
    addressStreet: text(80),
    addressCity: text(60),
    addressRegion: text(60),
    hoursDays: z.array(z.string()).transform((days) => DAY_NAMES.filter((day) => days.includes(day))),
    hoursOpen: clockTime,
    hoursClose: clockTime,
    responseTime: text(40, 2),
  })
  .refine((value) => value.hoursDays.length > 0, {
    message: "Pick at least one day",
    path: ["hoursDays"],
  })
  .refine((value) => value.hoursOpen < value.hoursClose, {
    message: "Closing time must be after opening time",
    path: ["hoursClose"],
  });

export function toBusinessInfo(value: z.infer<typeof businessSchema>): BusinessInfo {
  return {
    name: value.name,
    tagline: value.tagline,
    phone: value.phone,
    whatsapp: value.whatsapp,
    email: value.email,
    alertEmail: value.alertEmail,
    address: { street: value.addressStreet, city: value.addressCity, region: value.addressRegion },
    hours: { days: value.hoursDays, opens: value.hoursOpen, closes: value.hoursClose },
    responseTime: value.responseTime,
  };
}

const stepSchema = z.object({ title: text(60), body: text(200) });
const faqSchema = z.object({ question: text(120), answer: text(600) });

export const copySchema = z.object({
  automaticHeading: z.boolean(),
  heroHeading: text(120, 0),
  heroIntro: text(300, 10),
  automaticSteps: z.boolean(),
  steps: z.array(stepSchema).max(MAX_STEPS),
  automaticFaqs: z.boolean(),
  faqs: z.array(faqSchema).max(MAX_FAQS),
});

export function toCopyInput(value: z.infer<typeof copySchema>): CopyInput {
  return {
    heroHeading: value.automaticHeading || value.heroHeading === "" ? null : value.heroHeading,
    heroIntro: value.heroIntro,
    steps: value.automaticSteps ? null : value.steps,
    faqs: value.automaticFaqs ? null : value.faqs,
  };
}

/** Examples are typed one per line or separated by commas. */
export function splitExamples(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const bandSchema = z.object({
  label: text(30),
  range: text(30),
  summary: text(200),
  examples: z.array(text(40)).max(MAX_EXAMPLES),
});

export const bandsSchema = z.object(
  Object.fromEntries(MATERIAL_IDS.map((id) => [id, bandSchema])) as Record<MaterialId, typeof bandSchema>,
);

export type BandsInput = Record<MaterialId, Omit<TemperatureBandInfo, "id">>;

const truckSchema = z.object({
  capacityKg: z.coerce
    .number()
    .int("Capacity must be a whole number of kilograms")
    .min(100, "Capacity must be at least 100 kg")
    .max(60_000, "Capacity must be 60,000 kg or less"),
  name: text(40, 0).transform((value) => (value === "" ? null : value)),
});

export const fleetSchema = z
  .object({
    trucks: z.array(truckSchema).min(1, "Add at least one truck size").max(MAX_TRUCK_SIZES),
    minQuantityKg: z.coerce.number().int().min(1, "Minimum must be at least 1 kg"),
    maxQuantityKg: z.coerce.number().int().max(200_000, "Maximum must be 2,00,000 kg or less"),
    dedicatedFillPercent: z.coerce.number().int().min(1).max(100),
  })
  .refine((value) => value.minQuantityKg < value.maxQuantityKg, {
    message: "The minimum must be below the maximum",
    path: ["maxQuantityKg"],
  })
  .refine(
    (value) => new Set(value.trucks.map((truck) => truck.capacityKg)).size === value.trucks.length,
    { message: "Each truck size needs a different capacity", path: ["trucks"] },
  );

export function toFleetInput(value: z.infer<typeof fleetSchema>): FleetInput {
  return {
    trucks: [...value.trucks].sort((a, b) => a.capacityKg - b.capacityKg),
    minQuantityKg: value.minQuantityKg,
    maxQuantityKg: value.maxQuantityKg,
    dedicatedFillPercent: value.dedicatedFillPercent,
  };
}

/** Re-exported so form components can list the days without importing the hours helpers. */
export { DAY_NAMES, isDayName };
export type { Faq, Step };
