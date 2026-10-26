import { describe, expect, it } from "vitest";
import { passwordResetEmail } from "./emails";

const RESET_URL = "https://bharatreefer.com/desk/reset-password?token=abc_DEF-123";

describe("passwordResetEmail", () => {
  const email = passwordResetEmail({
    brand: "Bharat Reefer",
    name: "Priya Sharma",
    email: "priya@bharatreefer.com",
    url: RESET_URL,
    validMinutes: 30,
  });

  it("names the desk in the subject line", () => {
    expect(email.subject).toBe("Reset your Bharat Reefer desk password");
  });

  it("includes the account, the link and how long it works in both versions", () => {
    for (const body of [email.html, email.text]) {
      expect(body).toContain("Priya Sharma");
      expect(body).toContain("priya@bharatreefer.com");
      expect(body).toContain(RESET_URL);
      expect(body).toContain("30 minutes");
    }
  });

  it("escapes the team member's name", () => {
    const hostile = passwordResetEmail({
      brand: "Bharat Reefer",
      name: "<script>alert(1)</script>",
      email: "priya@bharatreefer.com",
      url: RESET_URL,
      validMinutes: 30,
    });
    expect(hostile.html).not.toContain("<script");
    expect(hostile.html).toContain("&lt;script&gt;");
  });
});
