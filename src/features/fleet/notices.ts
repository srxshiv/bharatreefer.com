import "server-only";
import { getSiteContent } from "@/features/content/data";
import { dateInIndia, toIsoDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { truckNoticeEmail, type NoticeTruck } from "./emails";
import { formatPlate } from "./plate";
import { isTrackingLinkFresh, truckNoticeDueAt } from "./tracking";

/**
 * Emails each customer which truck is coming for their load, once it is due (8 am India time
 * the day before pickup; see `truckNoticeDueAt`): one email per request, listing its trucks.
 * Runs daily from /api/cron/truck-notices, and straight after a truck is allotted, a load
 * moved or a pickup date changed (`quoteId`), so a late allotment is announced at once.
 * Never throws; returns how many went and how many could not be sent.
 */
export async function sendDueTruckNotices(scope: { quoteId?: string } = {}): Promise<{ sent: number; failed: number }> {
  try {
    const now = new Date();
    // Pickups today or tomorrow, in India: later ones are not due yet, earlier ones have left.
    const today = new Date(`${dateInIndia()}T00:00:00Z`);
    const tomorrow = new Date(`${dateInIndia(1)}T00:00:00Z`);
    const candidates = await db().truckAssignment.findMany({
      where: {
        deliveredAt: null,
        noticeSentAt: null,
        ...(scope.quoteId ? { quoteRequestId: scope.quoteId } : {}),
        quoteRequest: { status: "QUOTED", email: { not: null }, pickupDate: { gte: today, lte: tomorrow } },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        loadKg: true,
        vehicle: {
          select: { plateNumber: true, capacityKg: true, driverName: true, driverPhone: true, trackingUrl: true, trackingUrlSetAt: true },
        },
        quoteRequest: {
          select: { id: true, reference: true, contactName: true, email: true, originCity: true, destinationCity: true, pickupDate: true },
        },
      },
    });

    const due = new Map<string, typeof candidates>();
    for (const assignment of candidates) {
      const pickup = toIsoDate(assignment.quoteRequest.pickupDate!);
      if (truckNoticeDueAt(pickup) > now) continue;
      due.set(assignment.quoteRequest.id, [...(due.get(assignment.quoteRequest.id) ?? []), assignment]);
    }
    if (due.size === 0) return { sent: 0, failed: 0 };

    const { business } = await getSiteContent();
    const replyTo = business.alertEmail ?? business.email;
    let sent = 0;
    let failed = 0;

    for (const [quoteId, assignments] of due) {
      // Claimed before sending, so two runs at the same time cannot both send it.
      const claimed: typeof assignments = [];
      for (const assignment of assignments) {
        const { count } = await db().truckAssignment.updateMany({
          where: { id: assignment.id, noticeSentAt: null },
          data: { noticeSentAt: now },
        });
        if (count === 1) claimed.push(assignment);
      }
      if (claimed.length === 0) continue;

      const quote = claimed[0].quoteRequest;
      const trucks: NoticeTruck[] = claimed.map(({ loadKg, vehicle }) => ({
        plate: formatPlate(vehicle.plateNumber),
        capacityKg: vehicle.capacityKg,
        loadKg,
        driverName: vehicle.driverName,
        driverPhone: vehicle.driverPhone,
        trackingUrl: vehicle.trackingUrl && isTrackingLinkFresh(vehicle.trackingUrlSetAt, now.getTime()) ? vehicle.trackingUrl : null,
      }));
      const outcome = await sendEmail({
        to: quote.email!,
        replyTo,
        ...truckNoticeEmail({ ...quote, pickupDate: toIsoDate(quote.pickupDate!) }, trucks, business),
      });

      if (outcome.status === "sent") {
        sent += 1;
        await db().quoteActivity.create({
          data: { quoteRequestId: quoteId, type: "NOTIFICATION", body: `Truck details (${trucks.map((truck) => truck.plate).join(", ")}) emailed to ${quote.email}` },
        });
      } else {
        // Not sent (email not set up, or it failed): released, so the next run tries again.
        await db().truckAssignment.updateMany({ where: { id: { in: claimed.map((assignment) => assignment.id) } }, data: { noticeSentAt: null } });
        if (outcome.status === "failed") {
          failed += 1;
          console.error(`[email] Truck notice for ${quote.reference} to ${quote.email} failed: ${outcome.reason}`);
        }
      }
    }
    return { sent, failed };
  } catch (error) {
    console.error("[email] Could not send the truck notices", error);
    return { sent: 0, failed: 0 };
  }
}
