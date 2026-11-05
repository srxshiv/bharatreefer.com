import { connection } from "next/server";
import { sendDueTruckNotices } from "@/features/fleet/notices";
import { serverEnv } from "@/lib/env";

/**
 * Called by Vercel every morning to email customers whose pickup is tomorrow which truck is
 * coming. vercel.json asks for 3:00 UTC: on the Hobby plan Vercel runs it at some point in
 * that hour (8:30 to 9:30 am India time), always after the notices fall due at 8 am. Vercel
 * sends the CRON_SECRET it holds as a bearer token; without one set, this does nothing. A
 * missed or doubled run is harmless: each notice is claimed before it is sent, and a pickup
 * still waiting the next morning is picked up then.
 */
export async function GET(request: Request) {
  await connection();
  const secret = serverEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }
  const result = await sendDueTruckNotices();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
