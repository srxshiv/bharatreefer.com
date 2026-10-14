import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const created: string[] = [];
const disconnected: string[] = [];
const warmed: string[] = [];

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class {
    constructor(public options: { connectionString: string }) {}
  },
}));
vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: class {
    url: string;
    constructor({ adapter }: { adapter: { options: { connectionString: string } } }) {
      this.url = adapter.options.connectionString;
      created.push(this.url);
    }
    async $disconnect() {
      disconnected.push(this.url);
    }
    async $queryRaw() {
      warmed.push(this.url);
      return [];
    }
  },
}));

const LOCAL = "postgresql://user@localhost:5432/local";
const NEON = "postgresql://owner:secret@ep-example-pooler.neon.tech/neondb?sslmode=require";

async function load() {
  vi.resetModules();
  delete (globalThis as { prismaClient?: unknown }).prismaClient;
  return import("@/lib/db");
}

describe("db()", () => {
  beforeEach(() => {
    created.length = 0;
    disconnected.length = 0;
    warmed.length = 0;
    vi.stubEnv("IP_HASH_SALT", "x".repeat(64));
    vi.stubEnv("DATABASE_URL", LOCAL);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("reuses one client while the connection string stays the same", async () => {
    const { db } = await load();
    expect(db()).toBe(db());
    expect(created).toEqual([LOCAL]);
  });

  it("opens connections ahead of time when the client is created", async () => {
    const { db } = await load();
    db();
    db();
    await Promise.resolve();
    expect(warmed.length).toBeGreaterThan(1);
    expect(new Set(warmed)).toEqual(new Set([LOCAL]));
  });

  it("connects to the new database when DATABASE_URL changes, and closes the old pool", async () => {
    const { db } = await load();
    const first = db();
    vi.stubEnv("DATABASE_URL", NEON);
    const second = db();

    expect(second).not.toBe(first);
    // The SSL mode is written out as the one pg actually uses (see connection-string.ts).
    expect(created).toEqual([LOCAL, NEON.replace("sslmode=require", "sslmode=verify-full")]);
    await Promise.resolve();
    expect(disconnected).toEqual([LOCAL]);
  });
});

describe("describeDatabase", () => {
  it("names the host and database without the credentials", async () => {
    const { describeDatabase } = await load();
    expect(describeDatabase(NEON)).toBe("ep-example-pooler.neon.tech/neondb");
    expect(describeDatabase(LOCAL)).toBe("localhost:5432/local");
    expect(describeDatabase("not a url")).toBe("(unreadable DATABASE_URL)");
  });
});
