import { describe, expect, it } from "vitest";
import { formatInrShort } from "./format";

describe("formatInrShort", () => {
  it("is exact below a lakh and compact in lakh and crore above", () => {
    expect(formatInrShort(48_500)).toBe("₹48,500");
    expect(formatInrShort(485_000)).toBe("₹4.85L");
    expect(formatInrShort(1_250_000)).toBe("₹12.5L");
    expect(formatInrShort(23_500_000)).toBe("₹2.35Cr");
  });
});
