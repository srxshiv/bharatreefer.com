import { describe, expect, it } from "vitest";
import { DEFAULT_FLEET } from "@/config/fleet";
import { DEFAULT_BUSINESS } from "@/config/site";
import { automaticFaqs, automaticHeading, automaticSteps } from "./automatic";

describe("automatic copy", () => {
  it("builds the heading from the smallest and largest truck", () => {
    expect(automaticHeading(DEFAULT_FLEET)).toBe("Reefer trucks from 900 kg to 22 tonnes.");
    expect(automaticHeading({ ...DEFAULT_FLEET, capacitiesKg: [500, 750] })).toBe("Reefer trucks from 500 kg to 750 kg.");
    expect(automaticHeading({ ...DEFAULT_FLEET, capacitiesKg: [1500, 9000] })).toBe("Reefer trucks from 1.5 t to 9 tonnes.");
  });

  it("quotes the current limits, hours and phone number in the answers", () => {
    const faqs = automaticFaqs(
      { ...DEFAULT_BUSINESS, responseTime: "one working day", phone: "+919000000001" },
      { ...DEFAULT_FLEET, minQuantityKg: 25, maxQuantityKg: 40_000 },
    );
    expect(faqs[0].answer).toContain("25 kg");
    expect(faqs[1].answer).toContain("40,000 kg");
    expect(faqs[2].answer).toContain("one working day");
    expect(faqs[2].answer).toContain("Mon to Sat, 8:00 AM to 8:00 PM");
    expect(faqs[3].answer).toContain("90000 00001");
  });

  it("mentions the promised reply time in the steps", () => {
    expect(automaticSteps({ ...DEFAULT_BUSINESS, responseTime: "2 hours" })[1].body).toContain("2 hours");
  });
});
