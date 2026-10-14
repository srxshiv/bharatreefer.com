import { describe, expect, it } from "vitest";
import { formatPlate, normalisePlate } from "./plate";

describe("normalisePlate", () => {
  it("accepts the usual ways a plate is typed", () => {
    expect(normalisePlate("dl 01 la 4521")).toBe("DL01LA4521");
    expect(normalisePlate("HR-38-Z-4410")).toBe("HR38Z4410");
    expect(normalisePlate("mh12ab1234")).toBe("MH12AB1234");
    expect(normalisePlate("22 BH 1234 AA")).toBe("22BH1234AA");
  });

  it("rejects text that is not a registration", () => {
    expect(normalisePlate("")).toBeNull();
    expect(normalisePlate("TRUCK 1")).toBeNull();
    expect(normalisePlate("DL01LA45210")).toBeNull();
    expect(normalisePlate("D01LA4521")).toBeNull();
  });
});

describe("formatPlate", () => {
  it("spaces the groups as printed on the plate", () => {
    expect(formatPlate("DL01LA4521")).toBe("DL 01 LA 4521");
    expect(formatPlate("HR38Z4410")).toBe("HR 38 Z 4410");
    expect(formatPlate("KA019876")).toBe("KA 01 9876");
    expect(formatPlate("22BH1234AA")).toBe("22 BH 1234 AA");
  });

  it("leaves anything else alone", () => {
    expect(formatPlate("OLD-PLATE")).toBe("OLD-PLATE");
  });
});
