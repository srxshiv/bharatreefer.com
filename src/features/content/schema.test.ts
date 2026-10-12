import { describe, expect, it } from "vitest";
import { businessSchema, copySchema, fleetSchema, readRows, splitExamples, toCopyInput, toFleetInput } from "./schema";

function formDataFrom(entries: Array<[string, string]>): FormData {
  const formData = new FormData();
  for (const [key, value] of entries) formData.append(key, value);
  return formData;
}

describe("readRows", () => {
  it("rebuilds rows in index order from indexed field names", () => {
    const rows = readRows(
      formDataFrom([
        ["steps[1].title", "Second"],
        ["steps[0].title", "First"],
        ["steps[0].body", "first body"],
        ["steps[1].body", "second body"],
        ["other", "ignored"],
      ]),
      "steps",
    );
    expect(rows).toEqual([
      { title: "First", body: "first body" },
      { title: "Second", body: "second body" },
    ]);
  });

  it("keeps the order after a row in the middle was removed", () => {
    const rows = readRows(formDataFrom([["faqs[0].question", "a"], ["faqs[2].question", "c"]]), "faqs");
    expect(rows.map((row) => row.question)).toEqual(["a", "c"]);
  });
});

describe("businessSchema", () => {
  const valid = {
    name: "Bharat Reefer",
    tagline: "Refrigerated road transport",
    phone: "98710 94268",
    whatsapp: "",
    email: "Dispatch@Example.com",
    alertEmail: "",
    addressStreet: "Sector-17, Rohini",
    addressCity: "Delhi",
    addressRegion: "Delhi",
    hoursDays: ["Saturday", "Monday", "Funday"],
    hoursOpen: "08:00",
    hoursClose: "20:00",
    responseTime: "24 hours",
  };

  it("normalises phone numbers, emails and days", () => {
    const parsed = businessSchema.parse(valid);
    expect(parsed.phone).toBe("+919871094268");
    expect(parsed.whatsapp).toBeNull();
    expect(parsed.email).toBe("dispatch@example.com");
    expect(parsed.alertEmail).toBeNull();
    expect(parsed.hoursDays).toEqual(["Monday", "Saturday"]);
  });

  it("rejects hours that close before they open, and no days at all", () => {
    expect(businessSchema.safeParse({ ...valid, hoursClose: "07:00" }).success).toBe(false);
    expect(businessSchema.safeParse({ ...valid, hoursDays: [] }).success).toBe(false);
    expect(businessSchema.safeParse({ ...valid, hoursOpen: "8am" }).success).toBe(false);
  });

  it("rejects a bad phone number", () => {
    expect(businessSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
    expect(businessSchema.safeParse({ ...valid, whatsapp: "12345" }).success).toBe(false);
  });
});

describe("copySchema", () => {
  it("stores null for anything left on automatic", () => {
    const parsed = copySchema.parse({
      automaticHeading: true,
      heroHeading: "Ignored while automatic",
      heroIntro: "Frozen, chilled and ambient loads across India.",
      automaticSteps: false,
      steps: [{ title: "Call us", body: "We pick up the phone." }],
      automaticFaqs: true,
      faqs: [],
    });
    expect(toCopyInput(parsed)).toEqual({
      heroHeading: null,
      heroIntro: "Frozen, chilled and ambient loads across India.",
      steps: [{ title: "Call us", body: "We pick up the phone." }],
      faqs: null,
    });
  });

  it("treats an empty custom heading as automatic", () => {
    const parsed = copySchema.parse({
      automaticHeading: false,
      heroHeading: "  ",
      heroIntro: "Frozen, chilled and ambient loads across India.",
      automaticSteps: true,
      steps: [],
      automaticFaqs: true,
      faqs: [],
    });
    expect(toCopyInput(parsed).heroHeading).toBeNull();
  });
});

describe("fleetSchema", () => {
  const valid = {
    trucks: [
      { capacityKg: "22000", name: "" },
      { capacityKg: "900", name: "Tata Ace" },
    ],
    minQuantityKg: "10",
    maxQuantityKg: "50000",
    dedicatedFillPercent: "50",
  };

  it("sorts the sizes and converts the numbers", () => {
    expect(toFleetInput(fleetSchema.parse(valid))).toEqual({
      trucks: [
        { capacityKg: 900, name: "Tata Ace" },
        { capacityKg: 22_000, name: null },
      ],
      minQuantityKg: 10,
      maxQuantityKg: 50_000,
      dedicatedFillPercent: 50,
    });
  });

  it("rejects duplicate sizes, an empty fleet and inverted limits", () => {
    expect(fleetSchema.safeParse({ ...valid, trucks: [valid.trucks[0], valid.trucks[0]] }).success).toBe(false);
    expect(fleetSchema.safeParse({ ...valid, trucks: [] }).success).toBe(false);
    expect(fleetSchema.safeParse({ ...valid, minQuantityKg: "60000" }).success).toBe(false);
    expect(fleetSchema.safeParse({ ...valid, trucks: [{ capacityKg: "12.5", name: "" }] }).success).toBe(false);
  });
});

describe("splitExamples", () => {
  it("accepts one per line or comma separated", () => {
    expect(splitExamples("Ice cream\nSeafood, Meat \n\n")).toEqual(["Ice cream", "Seafood", "Meat"]);
  });
});
