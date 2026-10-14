import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { withExplicitSslMode } from "@/lib/connection-string";
import { serverEnv } from "@/lib/env";

type CachedClient = { connectionString: string; client: PrismaClient };

const globalForPrisma = globalThis as unknown as { prismaClient?: CachedClient };

/**
 * Shared Prisma client, kept on `globalThis` so dev hot reloads and warm serverless
 * invocations reuse one connection pool.
 *
 * It is keyed by the connection string: `next dev` reloads `.env` without restarting, so
 * when DATABASE_URL changes the next call connects to the new database instead of quietly
 * carrying on with the old one.
 */
export function db(): PrismaClient {
  const { DATABASE_URL } = serverEnv();
  const cached = globalForPrisma.prismaClient;
  if (cached?.connectionString === DATABASE_URL) return cached.client;

  // Closing the old pool lets queries already running on it finish first.
  if (cached) cached.client.$disconnect().catch(() => {});

  const client = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: withExplicitSslMode(DATABASE_URL),
      max: POOL_SIZE,
      // A new connection to a hosted database costs several round trips (TCP, TLS, auth),
      // about 650 ms to Neon from India. pg closes idle ones after 10 s by default, which
      // made the first click after any pause slow. Keep them for 10 minutes instead.
      idleTimeoutMillis: 10 * 60_000,
      keepAlive: true,
    }),
  });
  globalForPrisma.prismaClient = { connectionString: DATABASE_URL, client };
  warm(client);
  return client;
}

/** Most connections one server instance opens. Pages run up to this many queries at once. */
const POOL_SIZE = 8;
/** Connections opened ahead of time, so a page's parallel queries rarely wait for a new one. */
const WARM_CONNECTIONS = 6;

/** Opens connections in the background as soon as the client exists. Failures are ignored. */
function warm(client: PrismaClient) {
  for (let i = 0; i < WARM_CONNECTIONS; i += 1) {
    client.$queryRaw`SELECT 1`.catch(() => {});
  }
}

/** "host/database" for a connection string, without the credentials. Safe to log. */
export function describeDatabase(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
  } catch {
    return "(unreadable DATABASE_URL)";
  }
}
