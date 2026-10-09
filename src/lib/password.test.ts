import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies the password it hashed and rejects any other", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterz", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("salts every hash, so the same password never stores the same value", async () => {
    const [first, second] = await Promise.all([hashPassword("same-password"), hashPassword("same-password")]);
    expect(first).not.toBe(second);
    expect(first.startsWith("scrypt$32768$8$3$")).toBe(true);
  });

  it("treats visually identical unicode passwords as equal", async () => {
    // "é" as one code point versus "e" plus a combining accent.
    const hash = await hashPassword("café-password");
    expect(await verifyPassword("café-password", hash)).toBe(true);
  });

  it("rejects stored values it does not understand instead of throwing", async () => {
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "plaintext")).toBe(false);
    expect(await verifyPassword("anything", "bcrypt$10$abc$def")).toBe(false);
  });
});
