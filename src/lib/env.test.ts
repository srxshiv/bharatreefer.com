import { afterEach, describe, expect, it, vi } from "vitest";

describe("serverEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("picks up a changed value without a restart", async () => {
    vi.resetModules();
    const { serverEnv } = await import("@/lib/env");
    vi.stubEnv("IP_HASH_SALT", "x".repeat(64));
    vi.stubEnv("DATABASE_URL", "postgresql://user@localhost:5432/one");
    expect(serverEnv().DATABASE_URL).toBe("postgresql://user@localhost:5432/one");

    vi.stubEnv("DATABASE_URL", "postgresql://user@localhost:5432/two");
    expect(serverEnv().DATABASE_URL).toBe("postgresql://user@localhost:5432/two");
  });

  it("explains what is wrong with a bad configuration", async () => {
    vi.resetModules();
    const { serverEnv } = await import("@/lib/env");
    vi.stubEnv("IP_HASH_SALT", "short");
    vi.stubEnv("DATABASE_URL", "mysql://nope");
    expect(() => serverEnv()).toThrow(/DATABASE_URL must be a postgres:\/\/ connection string[\s\S]*IP_HASH_SALT must be at least 32/);
  });
});
