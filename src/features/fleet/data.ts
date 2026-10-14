import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { isMaterialId, type MaterialId } from "@/config/materials";
import { requireAdmin } from "@/features/auth/session";
import { getSiteContent } from "@/features/content/data";
import { toIsoDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatKg } from "@/lib/format";
import { planAllocation, type TruckLoad } from "./capacity";
import { formatPlate } from "./plate";
import type { FleetBoard, FleetLoad, FleetOutcome, FleetTruck, WaitingOrder } from "./types";

export type { FleetBoard, FleetLoad, FleetOutcome, FleetTruck, WaitingOrder };
import type { VehicleInput } from "./vehicle-input";

// Every function here checks the session itself, like src/features/quotes/admin.ts.
// Only CONFIRMED requests count towards what a truck is carrying: marking a request
// Completed frees the truck, and moving it back to an earlier stage takes it off.

const vehicleSelect = {
  id: true,
  plateNumber: true,
  capacityKg: true,
  model: true,
  driverName: true,
  driverPhone: true,
  status: true,
} satisfies Prisma.VehicleSelect;

const orderSelect = {
  id: true,
  reference: true,
  material: true,
  quantityKg: true,
  originCity: true,
  destinationCity: true,
  pickupDate: true,
  contactName: true,
} satisfies Prisma.QuoteRequestSelect;

export async function getFleetBoard(): Promise<FleetBoard> {
  // One round trip: everything runs together, joined up here rather than in the database.
  const [, vehicles, assignments, orders, content] = await Promise.all([
    requireAdmin(),
    db().vehicle.findMany({ orderBy: [{ capacityKg: "asc" }, { plateNumber: "asc" }], select: vehicleSelect }),
    db().truckAssignment.findMany({
      where: { quoteRequest: { status: "CONFIRMED" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, vehicleId: true, quoteRequestId: true, loadKg: true },
    }),
    db().quoteRequest.findMany({
      where: { status: "CONFIRMED" },
      orderBy: [{ pickupDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      select: orderSelect,
    }),
    getSiteContent(),
  ]);

  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const loadsByTruck = new Map<string, FleetLoad[]>();
  const assignedByOrder = new Map<string, number>();

  for (const assignment of assignments) {
    const order = ordersById.get(assignment.quoteRequestId);
    if (!order) continue;
    const loads = loadsByTruck.get(assignment.vehicleId) ?? [];
    loads.push({
      assignmentId: assignment.id,
      quoteId: order.id,
      reference: order.reference,
      loadKg: assignment.loadKg,
      quantityKg: order.quantityKg,
      material: order.material,
      originCity: order.originCity,
      destinationCity: order.destinationCity,
      pickupDate: order.pickupDate ? toIsoDate(order.pickupDate) : null,
      contactName: order.contactName,
    });
    loadsByTruck.set(assignment.vehicleId, loads);
    assignedByOrder.set(order.id, (assignedByOrder.get(order.id) ?? 0) + assignment.loadKg);
  }

  const trucks = vehicles.map((vehicle): FleetTruck => {
    const loads = loadsByTruck.get(vehicle.id) ?? [];
    return {
      ...vehicle,
      usedKg: loads.reduce((sum, load) => sum + load.loadKg, 0),
      material: loads[0]?.material ?? null,
      loads,
    };
  });

  const waiting = orders
    .map((order): WaitingOrder => ({
      id: order.id,
      reference: order.reference,
      material: order.material,
      quantityKg: order.quantityKg,
      assignedKg: assignedByOrder.get(order.id) ?? 0,
      originCity: order.originCity,
      destinationCity: order.destinationCity,
      pickupDate: order.pickupDate ? toIsoDate(order.pickupDate) : null,
      contactName: order.contactName,
    }))
    .filter((order) => order.assignedKg < order.quantityKg);

  return { trucks, waiting, sizes: content.trucks, confirmedCount: orders.length };
}

/** The trucks a request is on, for its detail page. */
export async function getQuoteAssignments(quoteId: string): Promise<
  Array<{ id: string; loadKg: number; plateNumber: string; capacityKg: number; driverName: string | null; driverPhone: string | null }>
> {
  const [, rows] = await Promise.all([
    requireAdmin(),
    db().truckAssignment.findMany({
      where: { quoteRequestId: quoteId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        loadKg: true,
        vehicle: { select: { plateNumber: true, capacityKg: true, driverName: true, driverPhone: true } },
      },
    }),
  ]);
  return rows.map((row) => ({ id: row.id, loadKg: row.loadKg, ...row.vehicle }));
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** What a truck is carrying for confirmed requests, read while its row is locked. */
type LockedTruck = {
  plate_number: string;
  capacity_kg: number;
  status: "AVAILABLE" | "MAINTENANCE";
  used_kg: number;
  material: string | null;
  loads: number;
};

function lockTruck(tx: Prisma.TransactionClient, vehicleId: string) {
  return tx.$queryRaw<LockedTruck[]>`
    SELECT v.plate_number, v.capacity_kg, v.status::text AS status,
      COALESCE((SELECT SUM(a.load_kg) FROM truck_assignments a JOIN quote_requests q ON q.id = a.quote_request_id
        WHERE a.vehicle_id = v.id AND q.status = 'CONFIRMED'), 0)::int AS used_kg,
      (SELECT MIN(q.material::text) FROM truck_assignments a JOIN quote_requests q ON q.id = a.quote_request_id
        WHERE a.vehicle_id = v.id AND q.status = 'CONFIRMED') AS material,
      (SELECT COUNT(*) FROM truck_assignments a JOIN quote_requests q ON q.id = a.quote_request_id
        WHERE a.vehicle_id = v.id AND q.status = 'CONFIRMED')::int AS loads
    FROM vehicles v WHERE v.id = ${vehicleId}
    FOR UPDATE OF v`;
}

type LockedOrder = {
  reference: string;
  status: string;
  material: MaterialId;
  quantity_kg: number;
  assigned_kg: number;
};

function lockOrder(tx: Prisma.TransactionClient, quoteId: string) {
  return tx.$queryRaw<LockedOrder[]>`
    SELECT q.reference, q.status::text AS status, q.material::text AS material, q.quantity_kg,
      COALESCE((SELECT SUM(a.load_kg) FROM truck_assignments a WHERE a.quote_request_id = q.id), 0)::int AS assigned_kg
    FROM quote_requests q WHERE q.id = ${quoteId}
    FOR UPDATE OF q`;
}

const NOT_CONFIRMED = "Only confirmed requests go on trucks. Mark it Confirmed first.";

export async function addVehicle(input: VehicleInput): Promise<FleetOutcome> {
  await requireAdmin();
  try {
    await db().vehicle.create({ data: input });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: `${formatPlate(input.plateNumber)} is already in the fleet.` };
    throw error;
  }
  return { ok: true, message: `${formatPlate(input.plateNumber)} added to the fleet.` };
}

export async function updateVehicle(id: string, input: VehicleInput): Promise<FleetOutcome> {
  await requireAdmin();
  try {
    return await db().$transaction(async (tx) => {
      const [truck] = await lockTruck(tx, id);
      if (!truck) return { ok: false, error: "This truck is no longer in the fleet." };
      if (input.capacityKg < truck.used_kg) {
        return {
          ok: false,
          error: `It is carrying ${formatKg(truck.used_kg)}. Take loads off before lowering the payload.`,
        };
      }
      await tx.vehicle.update({ where: { id }, data: input });
      return { ok: true, message: `${formatPlate(input.plateNumber)} saved.` };
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: `${formatPlate(input.plateNumber)} is already in the fleet.` };
    throw error;
  }
}

export async function setVehicleStatus(id: string, status: "AVAILABLE" | "MAINTENANCE"): Promise<FleetOutcome> {
  await requireAdmin();
  return db().$transaction(async (tx) => {
    const [truck] = await lockTruck(tx, id);
    if (!truck) return { ok: false, error: "This truck is no longer in the fleet." };
    const plate = formatPlate(truck.plate_number);
    if (status === "MAINTENANCE" && truck.loads > 0) {
      return { ok: false, error: `${plate} is carrying ${truck.loads === 1 ? "a load" : `${truck.loads} loads`}. Move them first.` };
    }
    await tx.vehicle.update({ where: { id }, data: { status } });
    return { ok: true, message: status === "MAINTENANCE" ? `${plate} is in maintenance.` : `${plate} is available.` };
  });
}

export async function deleteVehicle(id: string): Promise<FleetOutcome> {
  await requireAdmin();
  return db().$transaction(async (tx) => {
    const [truck] = await lockTruck(tx, id);
    if (!truck) return { ok: false, error: "This truck is no longer in the fleet." };
    const plate = formatPlate(truck.plate_number);
    if (truck.loads > 0) {
      return { ok: false, error: `${plate} is carrying ${truck.loads === 1 ? "a load" : `${truck.loads} loads`}. Move them first.` };
    }
    // Past trips go with it; each request's timeline still records which truck it was on.
    await tx.vehicle.delete({ where: { id } });
    return { ok: true, message: `${plate} removed from the fleet.` };
  });
}

/**
 * Puts a request's weight on a truck: `kg`, or as much as fits when omitted. Both rows are
 * locked (the request first, as everywhere) so two people placing loads at the same time
 * cannot overfill a truck or place more than the request weighs.
 */
export async function assignLoad(quoteId: string, vehicleId: string, kg?: number): Promise<FleetOutcome> {
  const admin = await requireAdmin();
  return db().$transaction(async (tx) => {
    const [order] = await lockOrder(tx, quoteId);
    if (!order) return { ok: false, error: "This request no longer exists." };
    if (order.status !== "CONFIRMED") return { ok: false, error: NOT_CONFIRMED };

    const [truck] = await lockTruck(tx, vehicleId);
    if (!truck) return { ok: false, error: "This truck is no longer in the fleet." };
    const plate = formatPlate(truck.plate_number);
    if (truck.status === "MAINTENANCE") return { ok: false, error: `${plate} is in maintenance.` };
    if (truck.material !== null && truck.material !== order.material) {
      return { ok: false, error: `${plate} is carrying a different temperature band. One band per truck.` };
    }

    const free = Math.max(0, truck.capacity_kg - truck.used_kg);
    const remaining = order.quantity_kg - order.assigned_kg;
    if (remaining <= 0) return { ok: false, error: `${order.reference} is already on trucks.` };
    if (free === 0) return { ok: false, error: `${plate} is full.` };

    const loadKg = kg ?? Math.min(remaining, free);
    if (loadKg > free) return { ok: false, error: `Only ${formatKg(free)} is free on ${plate}.` };
    if (loadKg > remaining) return { ok: false, error: `Only ${formatKg(remaining)} of ${order.reference} is left to place.` };

    await tx.truckAssignment.upsert({
      where: { vehicleId_quoteRequestId: { vehicleId, quoteRequestId: quoteId } },
      create: { vehicleId, quoteRequestId: quoteId, loadKg },
      update: { loadKg: { increment: loadKg } },
    });
    await tx.quoteActivity.create({
      data: { quoteRequestId: quoteId, authorId: admin.id, type: "ASSIGNMENT", body: `Placed ${formatKg(loadKg)} on ${plate}` },
    });

    const left = remaining - loadKg;
    return {
      ok: true,
      message: left > 0
        ? `${formatKg(loadKg)} of ${order.reference} on ${plate}. ${formatKg(left)} still to place.`
        : `${order.reference} is on ${plate}.`,
    };
  });
}

/** Places whatever is left of a request using the same ranking the board suggests. */
export async function autoAssignLoad(quoteId: string): Promise<FleetOutcome> {
  const admin = await requireAdmin();
  return db().$transaction(async (tx) => {
    const [order] = await lockOrder(tx, quoteId);
    if (!order) return { ok: false, error: "This request no longer exists." };
    if (order.status !== "CONFIRMED") return { ok: false, error: NOT_CONFIRMED };
    const remaining = order.quantity_kg - order.assigned_kg;
    if (remaining <= 0) return { ok: false, error: `${order.reference} is already on trucks.` };

    // Every truck is a candidate, so lock them all, in a fixed order.
    await tx.$queryRaw`SELECT id FROM vehicles ORDER BY id FOR UPDATE`;
    const rows = await tx.$queryRaw<Array<{ id: string; plate_number: string; capacity_kg: number; status: "AVAILABLE" | "MAINTENANCE"; used_kg: number; material: string | null }>>`
      SELECT v.id, v.plate_number, v.capacity_kg, v.status::text AS status,
        COALESCE(SUM(a.load_kg) FILTER (WHERE q.status = 'CONFIRMED'), 0)::int AS used_kg,
        MIN(q.material::text) FILTER (WHERE q.status = 'CONFIRMED') AS material
      FROM vehicles v
      LEFT JOIN truck_assignments a ON a.vehicle_id = v.id
      LEFT JOIN quote_requests q ON q.id = a.quote_request_id
      GROUP BY v.id`;

    const trucks: TruckLoad[] = rows.map((row) => ({
      id: row.id,
      plateNumber: row.plate_number,
      capacityKg: row.capacity_kg,
      status: row.status,
      usedKg: row.used_kg,
      material: isMaterialId(row.material) ? row.material : null,
    }));
    const plan = planAllocation(trucks, order.material, remaining);
    if (plan.length === 0) {
      return { ok: false, error: "No available truck has room for this temperature band right now." };
    }

    const plates = new Map(trucks.map((truck) => [truck.id, formatPlate(truck.plateNumber)]));
    for (const { truckId, loadKg } of plan) {
      await tx.truckAssignment.upsert({
        where: { vehicleId_quoteRequestId: { vehicleId: truckId, quoteRequestId: quoteId } },
        create: { vehicleId: truckId, quoteRequestId: quoteId, loadKg },
        update: { loadKg: { increment: loadKg } },
      });
    }
    const placed = plan.map(({ truckId, loadKg }) => `${formatKg(loadKg)} on ${plates.get(truckId)}`).join(", ");
    await tx.quoteActivity.create({
      data: { quoteRequestId: quoteId, authorId: admin.id, type: "ASSIGNMENT", body: `Placed automatically: ${placed}` },
    });

    const left = remaining - plan.reduce((sum, allocation) => sum + allocation.loadKg, 0);
    return {
      ok: true,
      message: left > 0
        ? `${order.reference}: ${placed}. ${formatKg(left)} still needs a truck.`
        : `${order.reference}: ${placed}.`,
    };
  });
}

export async function unassignLoad(assignmentId: string): Promise<FleetOutcome> {
  const admin = await requireAdmin();
  return db().$transaction(async (tx) => {
    const assignment = await tx.truckAssignment.findUnique({
      where: { id: assignmentId },
      select: { quoteRequestId: true, loadKg: true, vehicle: { select: { plateNumber: true } }, quoteRequest: { select: { reference: true } } },
    });
    if (!assignment) return { ok: false, error: "That load was already taken off." };
    const plate = formatPlate(assignment.vehicle.plateNumber);

    await tx.truckAssignment.delete({ where: { id: assignmentId } });
    await tx.quoteActivity.create({
      data: {
        quoteRequestId: assignment.quoteRequestId,
        authorId: admin.id,
        type: "ASSIGNMENT",
        body: `Took ${formatKg(assignment.loadKg)} off ${plate}`,
      },
    });
    return { ok: true, message: `${assignment.quoteRequest.reference} taken off ${plate}.` };
  });
}

