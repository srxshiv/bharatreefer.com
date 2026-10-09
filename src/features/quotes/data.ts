import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { generateReference } from "@/lib/reference";
import type { TruckPlan } from "@/lib/truck-plan";
import type { QuoteRequestInput } from "./schema";

/** Postgres unique-constraint violation, as reported by Prisma. */
const UNIQUE_VIOLATION = "P2002";
const REFERENCE_ATTEMPTS = 5;

export type SubmissionMeta = {
  ipHash: string | null;
  userAgent: string | null;
};

/** Number of quote requests received from one hashed IP since the given time. */
export function countQuoteRequestsFrom(ipHash: string, since: Date): Promise<number> {
  return db().quoteRequest.count({
    where: { ipHash, createdAt: { gte: since } },
  });
}

/** Stores a validated quote request and returns its customer-facing reference. */
export async function createQuoteRequest(
  input: QuoteRequestInput,
  plan: TruckPlan,
  meta: SubmissionMeta,
): Promise<{ id: string; reference: string }> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await db().quoteRequest.create({
        data: {
          reference: generateReference(),
          originState: input.originState,
          originCity: input.originCity,
          destinationState: input.destinationState,
          destinationCity: input.destinationCity,
          material: input.material,
          quantityKg: input.quantityKg,
          loadType: plan.loadType,
          truckPlan: plan.trucks,
          pickupDate: input.pickupDate ? new Date(`${input.pickupDate}T00:00:00Z`) : null,
          notes: input.notes ?? null,
          contactName: input.contactName,
          phone: input.phone,
          email: input.email ?? null,
          ipHash: meta.ipHash,
          userAgent: meta.userAgent,
        },
        select: { id: true, reference: true },
      });
    } catch (error) {
      // A reference collision is astronomically rare; draw a new code and retry.
      const collided =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
      if (!collided || attempt >= REFERENCE_ATTEMPTS) throw error;
    }
  }
}

/** Adds a system entry (no author) to a request's timeline, such as "email sent". */
export async function recordNotification(quoteRequestId: string, body: string): Promise<void> {
  await db().quoteActivity.create({ data: { quoteRequestId, type: "NOTIFICATION", body } });
}
