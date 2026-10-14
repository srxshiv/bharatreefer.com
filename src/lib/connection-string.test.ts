import { describe, expect, it } from "vitest";
import { withExplicitSslMode } from "./connection-string";

describe("withExplicitSslMode", () => {
  it("writes out verify-full for the modes pg already treats that way", () => {
    expect(withExplicitSslMode("postgresql://u:p@host/db?sslmode=require&channel_binding=require")).toBe(
      "postgresql://u:p@host/db?sslmode=verify-full&channel_binding=require",
    );
    expect(withExplicitSslMode("postgresql://u:p@host/db?sslmode=prefer")).toContain("sslmode=verify-full");
  });

  it("leaves other connection strings alone", () => {
    for (const url of [
      "postgresql://u:p@localhost:5432/db",
      "postgresql://u:p@host/db?sslmode=disable",
      "postgresql://u:p@host/db?sslmode=require&uselibpqcompat=true",
      "not a url",
    ]) {
      expect(withExplicitSslMode(url)).toBe(url);
    }
  });
});
