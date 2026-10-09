import { describe, expect, it } from "vitest";
import { formatIndianMobile, normaliseIndianMobile } from "@/lib/phone";

describe("normaliseIndianMobile", () => {
  it.each([
    ["9871094268", "+919871094268"],
    ["98710 94268", "+919871094268"],
    ["+91 98710 94268", "+919871094268"],
    ["+91-98710-94268", "+919871094268"],
    ["919871094268", "+919871094268"],
    ["09871094268", "+919871094268"],
    ["(98710) 94268", "+919871094268"],
    ["9198765432", "+919198765432"],
  ])("accepts %s", (input, expected) => {
    expect(normaliseIndianMobile(input)).toBe(expected);
  });

  it.each([
    [""],
    ["12345"],
    ["5871094268"],
    ["98710942680"],
    ["98710-9426x"],
    ["+1 415 555 0100"],
    ["011 2345 6789"],
  ])("rejects %s", (input) => {
    expect(normaliseIndianMobile(input)).toBeNull();
  });
});

describe("formatIndianMobile", () => {
  it("groups the ten digits five and five", () => {
    expect(formatIndianMobile("+919871094268")).toBe("98710 94268");
  });
});
