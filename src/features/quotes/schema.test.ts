import { describe, expect, it } from "vitest";
import { DEFAULT_FLEET } from "@/config/fleet";
import { dateInIndia } from "@/lib/dates";
import {
  EMPTY_QUOTE_FORM,
  createQuoteRequestSchema,
  parseQuantityKg,
  toFieldErrors,
  type QuoteFormValues,
} from "./schema";

const quoteRequestSchema = createQuoteRequestSchema(DEFAULT_FLEET);

const valid: QuoteFormValues = {
  originState: "Punjab",
  originCity: "Ludhiana",
  destinationState: "Maharashtra",
  destinationCity: "Mumbai",
  material: "FROZEN",
  quantityKg: "12,500",
  contactName: "  Asha Verma ",
  phone: "+91 98710 94268",
  email: "Asha@Example.com",
  pickupDate: "",
  notes: "",
  promoCode: "",
};

function errorsFor(overrides: Partial<QuoteFormValues>) {
  const result = quoteRequestSchema.safeParse({ ...valid, ...overrides });
  return result.success ? {} : toFieldErrors(result.error);
}

describe("quoteRequestSchema", () => {
  it("normalises a valid request", () => {
    expect(quoteRequestSchema.parse(valid)).toEqual({
      originState: "Punjab",
      originCity: "Ludhiana",
      destinationState: "Maharashtra",
      destinationCity: "Mumbai",
      material: "FROZEN",
      quantityKg: 12_500,
      contactName: "Asha Verma",
      phone: "+919871094268",
      email: "asha@example.com",
      pickupDate: undefined,
      notes: undefined,
    });
  });

  it("treats email, pickup date and notes as optional", () => {
    const parsed = quoteRequestSchema.parse({ ...valid, email: "  ", pickupDate: "", notes: " " });
    expect(parsed.email).toBeUndefined();
    expect(parsed.pickupDate).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
  });

  it("reports every missing field on an empty form", () => {
    const result = quoteRequestSchema.safeParse(EMPTY_QUOTE_FORM);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(toFieldErrors(result.error)).sort()).toEqual([
      "contactName",
      "destinationCity",
      "destinationState",
      "originCity",
      "originState",
      "phone",
      "quantityKg",
    ]);
  });

  it("only accepts known states and temperature bands", () => {
    expect(errorsFor({ originState: "Atlantis" }).originState).toBe("Select the loading state");
    expect(errorsFor({ material: "LUKEWARM" }).material).toBe("Choose a temperature band");
  });

  it("accepts towns that are not in the suggestion list", () => {
    expect(errorsFor({ originCity: "Kotkapura", destinationCity: "Vasai-Virar (E)" })).toEqual({});
  });

  it("rejects markup in the city fields", () => {
    expect(errorsFor({ originCity: "<script>" }).originCity).toBeDefined();
  });

  it("reads the weight limits from the fleet settings", () => {
    const narrow = createQuoteRequestSchema({ minQuantityKg: 500, maxQuantityKg: 2000 });
    const result = narrow.safeParse({ ...valid, quantityKg: "100" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).quantityKg).toBe("Enter a weight between 500 kg and 2,000 kg");
    }
    expect(narrow.safeParse({ ...valid, quantityKg: "1,500" }).success).toBe(true);
  });

  it("keeps the weight inside the accepted range", () => {
    expect(errorsFor({ quantityKg: "9" }).quantityKg).toBe(
      "Enter a weight between 10 kg and 50,000 kg",
    );
    expect(errorsFor({ quantityKg: "50001" }).quantityKg).toBeDefined();
    expect(errorsFor({ quantityKg: "12.5" }).quantityKg).toBe("Enter the weight in kilograms");
    expect(errorsFor({ quantityKg: "ten" }).quantityKg).toBe("Enter the weight in kilograms");
    expect(errorsFor({ quantityKg: "10" })).toEqual({});
    expect(errorsFor({ quantityKg: "50000" })).toEqual({});
  });

  it("validates the phone number and email", () => {
    expect(errorsFor({ phone: "12345" }).phone).toBe("Enter a 10-digit Indian mobile number");
    expect(errorsFor({ email: "not-an-email" }).email).toBeDefined();
  });

  it("accepts a pickup date from today up to a year ahead", () => {
    expect(errorsFor({ pickupDate: dateInIndia() })).toEqual({});
    expect(errorsFor({ pickupDate: dateInIndia(30) })).toEqual({});
    expect(errorsFor({ pickupDate: dateInIndia(-1) }).pickupDate).toBe(
      "Pickup date cannot be in the past",
    );
    expect(errorsFor({ pickupDate: dateInIndia(400) }).pickupDate).toBeDefined();
    expect(errorsFor({ pickupDate: "2026-02-30" }).pickupDate).toBe("Enter a valid date");
    expect(errorsFor({ pickupDate: "tomorrow" }).pickupDate).toBe("Enter a valid date");
  });

  it("stores notes with plain line breaks", () => {
    const parsed = quoteRequestSchema.parse({ ...valid, notes: " line one\r\nline two\r\n" });
    expect(parsed.notes).toBe("line one\nline two");
  });

  it("caps the notes length", () => {
    expect(errorsFor({ notes: "x".repeat(1001) }).notes).toBeDefined();
    expect(errorsFor({ notes: "x".repeat(1000) })).toEqual({});
  });
});

describe("promo code", () => {
  it("is optional, and stored uppercase without spaces", () => {
    expect(quoteRequestSchema.parse(valid).promoCode).toBeUndefined();
    expect(quoteRequestSchema.parse({ ...valid, promoCode: " priya " }).promoCode).toBe("PRIYA");
  });

  it("must look like a code", () => {
    expect(errorsFor({ promoCode: "PR" }).promoCode).toMatch(/4 or 5 letters/);
    expect(errorsFor({ promoCode: "PRIYAS" }).promoCode).toMatch(/4 or 5 letters/);
    expect(errorsFor({ promoCode: "PR!Y" }).promoCode).toMatch(/4 or 5 letters/);
  });
});

describe("parseQuantityKg", () => {
  it("reads whole numbers with or without grouping", () => {
    expect(parseQuantityKg("900")).toBe(900);
    expect(parseQuantityKg("12,500")).toBe(12_500);
    expect(parseQuantityKg(" 12 500 ")).toBe(12_500);
  });

  it("returns null for anything else", () => {
    expect(parseQuantityKg("")).toBeNull();
    expect(parseQuantityKg("12.5")).toBeNull();
    expect(parseQuantityKg("-5")).toBeNull();
    expect(parseQuantityKg("1e3")).toBeNull();
  });
});
