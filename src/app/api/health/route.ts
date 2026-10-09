import { connection } from "next/server";
import { db } from "@/lib/db";

/** Names Postgres uses for a zero-offset session time zone. */
const UTC_ZONES = new Set(["UTC", "Etc/UTC", "GMT", "Etc/GMT", "UCT", "Etc/UCT", "Zulu", "Etc/Zulu"]);

/**
 * Uptime probe: 200 when the app can reach a correctly configured database, 503 otherwise.
 * The details go to the server log, not the response.
 */
export async function GET() {
  // Always answer at request time; a health check must never be prerendered at build.
  await connection();

  try {
    const [session] = await db().$queryRaw<
      Array<{ timezone: string }>
    >`SELECT current_setting('TimeZone') AS timezone`;

    // The Prisma driver adapter reads and writes timestamps as UTC, so any other session
    // time zone silently shifts every stored time. The migrations pin the database to UTC.
    if (!session || !UTC_ZONES.has(session.timezone)) {
      throw new Error(
        `Database session time zone is "${session?.timezone}", expected UTC. Run "pnpm db:deploy".`,
      );
    }

    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
