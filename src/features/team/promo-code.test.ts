import { describe, expect, it } from "vitest";
import {
  choosePromoCode,
  isPromoCode,
  normalisePromoCode,
  promoCodeCandidates,
  randomPromoCode,
} from "./promo-code";

describe("promoCodeCandidates", () => {
  it("starts with the first name, then mixes in the last name", () => {
    expect(promoCodeCandidates("Priya Sharma", "priya@example.com")).toEqual(["PRIYA", "PRISH", "PRIYS", "PSHAR", "SHARM"]);
  });

  it("uses a four-letter first name whole", () => {
    expect(promoCodeCandidates("Asha", "asha@example.com")[0]).toBe("ASHA");
  });

  it("drops accents and anything that is not a letter", () => {
    expect(promoCodeCandidates("Rāj Kumār-Singh", "raj@example.com")[0]).toBe("RAJSI");
  });

  it("falls back to the email address for a name without Latin letters", () => {
    expect(promoCodeCandidates("प्रिया", "priya.s@example.com")[0]).toBe("PRIYA");
  });

  it("only offers valid codes", () => {
    for (const code of promoCodeCandidates("Al Bo", "x@example.com")) expect(isPromoCode(code)).toBe(true);
  });
});

describe("randomPromoCode", () => {
  it("keeps the name's first three letters and avoids look-alike characters", () => {
    const code = randomPromoCode("Priya Sharma", "priya@example.com", () => 0);
    expect(code).toBe("PRIAA");
    expect(isPromoCode(randomPromoCode("Priya Sharma", "priya@example.com"))).toBe(true);
  });

  it("pads a very short name", () => {
    expect(randomPromoCode("", "a@example.com", () => 0)).toBe("AXXAA");
  });
});

describe("choosePromoCode", () => {
  it("takes the first candidate nobody has", async () => {
    const code = await choosePromoCode("Priya Sharma", "p@example.com", async (codes) => codes.filter((c) => c === "PRIYA"));
    expect(code).toBe("PRISH");
  });

  it("falls back to a random code once every candidate is taken", async () => {
    const taken = promoCodeCandidates("Priya Sharma", "p@example.com");
    const code = await choosePromoCode("Priya Sharma", "p@example.com", async (codes) => codes.filter((c) => taken.includes(c)));
    expect(taken).not.toContain(code);
    expect(code).toMatch(/^PRI[A-Z2-9]{2}$/);
  });
});

describe("normalisePromoCode", () => {
  it("ignores case, spaces and dashes", () => {
    expect(normalisePromoCode(" priya-1 ")).toBe("PRIYA1");
  });
});
