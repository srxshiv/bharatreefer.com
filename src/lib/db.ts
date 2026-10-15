import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { withExplicitSslMode } from "@/lib/connection-string";
import { serverEnv } from "@/lib/env";

type CachedClient = { connectionString: string; client: PrismaClient };

/** Bump when the pool settings below change, so a running dev server opens a new pool. */
const POOL_VERSION = 2;

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
  const key = `${POOL_VERSION}:${DATABASE_URL}`;
  const cached = globalForPrisma.prismaClient;
  if (cached?.connectionString === key) return cached.client;

  // Closing the old pool lets queries already running on it finish first.
  if (cached) cached.client.$disconnect().catch(() => {});

  const client = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: withExplicitSslMode(DATABASE_URL),
      max: POOL_SIZE,
      // A new connection to a hosted database costs several round trips (TCP, TLS, auth),
      // about 650 ms to Neon from India. pg closes idle ones after 10 s by default, which
      // made the first click after any pause slow. Keep them for 5 minutes instead.
      idleTimeoutMillis: 5 * 60_000,
      // Idle connections can die without notice: a router or mobile hotspot forgets the
      // connection, or the network changes. A query sent on one then hangs. So:
      // - probe idle connections every 10 s, which also keeps routers from forgetting them;
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      // - replace every connection after 5 minutes, however healthy it looks;
      maxLifetimeSeconds: 300,
      // - give up on a query after 20 s (they take well under 1 s), which also discards the
      //   connection it was on, and on opening a connection after 10 s.
      query_timeout: 20_000,
      connectionTimeoutMillis: 10_000,
    }),
  });
  globalForPrisma.prismaClient = { connectionString: key, client };
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
