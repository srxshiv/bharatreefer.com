import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { MaterialId } from "@/config/materials";
import { ADMIN_DATA_TAG, ADMIN_PAGE_CACHE, requireAdmin } from "@/features/auth/session";
import { getSiteContent } from "@/features/content/data";
import { dateInIndia, toIsoDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatKg } from "@/lib/format";
import { formatPlate } from "./plate";
import type { FleetBoard, FleetLoad, FleetOutcome, FleetTruck, TruckStatus, WaitingOrder } from "./types";
import type { VehicleInput } from "./vehicle-input";

export type { FleetBoard, FleetLoad, FleetOutcome, FleetTruck, WaitingOrder };

// Every function here checks the session itself, like src/features/quotes/admin.ts.
//
// The rules:
// - A load is on board while its assignment has no delivery time. Ending a trip delivers
//   everything on the truck; a request whose weight has all been delivered is marked Completed.
// - The owner decides what goes where. Any load can go on any truck: trucks have no
//   temperature of their own, and loads of different temperatures can share one. Trucks can be
//   loaded past their payload (the board shows by how much). Only trucks on a trip or in
//   maintenance take no new loads.
// - A request never has more weight placed than it weighs.

const vehicleSelect = {
  id: true,
  plateNumber: true,
  capacityKg: true,
  model: true,
  driverName: true,
  driverPhone: true,
  lengthFt: true,
  tyres: true,
  status: true,
  tripStartedAt: true,
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

const ON_BOARD = { deliveredAt: null, quoteRequest: { status: "CONFIRMED" } } satisfies Prisma.TruckAssignmentWhereInput;

export async function getFleetBoard(): Promise<FleetBoard> {
  "use cache: private";
  cacheLife(ADMIN_PAGE_CACHE);
  cacheTag(ADMIN_DATA_TAG);
  // One round trip: everything runs together, joined up here rather than in the database.
  const [, vehicles, onBoard, placed, orders, content] = await Promise.all([
    requireAdmin(),
    db().vehicle.findMany({ orderBy: [{ capacityKg: "asc" }, { plateNumber: "asc" }], select: vehicleSelect }),
    db().truckAssignment.findMany({
      where: ON_BOARD,
      orderBy: { createdAt: "asc" },
      select: { id: true, vehicleId: true, quoteRequestId: true, loadKg: true },
    }),
    db().truckAssignment.groupBy({
      by: ["quoteRequestId"],
      where: { quoteRequest: { status: "CONFIRMED" } },
      _sum: { loadKg: true },
    }),
    db().quoteRequest.findMany({
      where: { status: "CONFIRMED" },
      orderBy: [{ pickupDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      select: orderSelect,
    }),
    getSiteContent(),
  ]);

  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const placedByOrder = new Map(placed.map((row) => [row.quoteRequestId, row._sum.loadKg ?? 0]));
  const loadsByTruck = new Map<string, FleetLoad[]>();

  for (const assignment of onBoard) {
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
  }

  const trucks = vehicles.map((vehicle): FleetTruck => {
    const loads = loadsByTruck.get(vehicle.id) ?? [];
    return {
      ...vehicle,
      tripStartedAt: vehicle.tripStartedAt?.toISOString() ?? null,
      usedKg: loads.reduce((sum, load) => sum + load.loadKg, 0),
      loads,
    };
  });

  const waiting = orders
    .map((order): WaitingOrder => ({
      id: order.id,
      reference: order.reference,
      material: order.material,
      quantityKg: order.quantityKg,
      assignedKg: placedByOrder.get(order.id) ?? 0,
      originCity: order.originCity,
      destinationCity: order.destinationCity,
      pickupDate: order.pickupDate ? toIsoDate(order.pickupDate) : null,
      contactName: order.contactName,
    }))
    .filter((order) => order.assignedKg < order.quantityKg);

  return { trucks, waiting, sizes: content.trucks, confirmedCount: orders.length, today: dateInIndia() };
}

export type QuoteAssignment = {
  id: string;
  loadKg: number;
  deliveredAt: Date | null;
  plateNumber: string;
  capacityKg: number;
  status: TruckStatus;
  driverName: string | null;
  driverPhone: string | null;
};

/** The trucks a request is on, or was delivered by, for its detail page. */
export async function getQuoteAssignments(quoteId: string): Promise<QuoteAssignment[]> {
  "use cache: private";
  cacheLife(ADMIN_PAGE_CACHE);
  cacheTag(ADMIN_DATA_TAG);
  const [, rows] = await Promise.all([
    requireAdmin(),
    db().truckAssignment.findMany({
      where: { quoteRequestId: quoteId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        loadKg: true,
        deliveredAt: true,
        vehicle: { select: { plateNumber: true, capacityKg: true, status: true, driverName: true, driverPhone: true } },
      },
    }),
  ]);
  return rows.map(({ vehicle, ...row }) => ({ ...row, ...vehicle }));
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

type LockedTruck = { plate_number: string; capacity_kg: number; status: TruckStatus; used_kg: number; loads: number };

/** Locks a truck's row and reads what is on board. */
async function lockTruck(tx: Prisma.TransactionClient, vehicleId: string): Promise<LockedTruck | undefined> {
  const [truck] = await tx.$queryRaw<LockedTruck[]>`
    SELECT v.plate_number, v.capacity_kg, v.status::text AS status,
      COALESCE((SELECT SUM(a.load_kg) FROM truck_assignments a JOIN quote_requests q ON q.id = a.quote_request_id
        WHERE a.vehicle_id = v.id AND a.delivered_at IS NULL AND q.status = 'CONFIRMED'), 0)::int AS used_kg,
      (SELECT COUNT(*) FROM truck_assignments a JOIN quote_requests q ON q.id = a.quote_request_id
        WHERE a.vehicle_id = v.id AND a.delivered_at IS NULL AND q.status = 'CONFIRMED')::int AS loads
    FROM vehicles v WHERE v.id = ${vehicleId}
    FOR UPDATE OF v`;
  return truck;
}

type LockedOrder = { reference: string; status: string; material: MaterialId; quantity_kg: number; placed_kg: number };

/** Locks a request's row and reads how much of it is already on trucks or delivered. */
async function lockOrder(tx: Prisma.TransactionClient, quoteId: string): Promise<LockedOrder | undefined> {
  const [order] = await tx.$queryRaw<LockedOrder[]>`
    SELECT q.reference, q.status::text AS status, q.material::text AS material, q.quantity_kg,
      COALESCE((SELECT SUM(a.load_kg) FROM truck_assignments a WHERE a.quote_request_id = q.id), 0)::int AS placed_kg
    FROM quote_requests q WHERE q.id = ${quoteId}
    FOR UPDATE OF q`;
  return order;
}

const NOT_CONFIRMED = "Only confirmed requests go on trucks. Mark it Confirmed first.";
const GONE_TRUCK = "This truck is no longer in the fleet.";

function cannotLoad(plate: string, status: TruckStatus): string | null {
  if (status === "ON_TRIP") return `${plate} is on a trip. End the trip first, or choose another truck.`;
  if (status === "MAINTENANCE") return `${plate} is in maintenance.`;
  return null;
}

function overNote(capacityKg: number, afterKg: number): string {
  return afterKg > capacityKg ? `, ${formatKg(afterKg - capacityKg)} over its payload` : "";
}

/** Adds weight to the truck's load for this request, or starts one. */
async function putOnTruck(tx: Prisma.TransactionClient, vehicleId: string, quoteId: string, kg: number) {
  const existing = await tx.truckAssignment.findFirst({
    where: { vehicleId, quoteRequestId: quoteId, deliveredAt: null },
    select: { id: true },
  });
  if (existing) {
    await tx.truckAssignment.update({ where: { id: existing.id }, data: { loadKg: { increment: kg } } });
  } else {
    await tx.truckAssignment.create({ data: { vehicleId, quoteRequestId: quoteId, loadKg: kg } });
  }
}

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
    const { count } = await db().vehicle.updateMany({ where: { id }, data: input });
    if (count === 0) return { ok: false, error: GONE_TRUCK };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: `${formatPlate(input.plateNumber)} is already in the fleet.` };
    throw error;
  }
  return { ok: true, message: `${formatPlate(input.plateNumber)} saved.` };
}

/** Available or in maintenance. Trips have their own start and end. */
export async function setVehicleStatus(id: string, status: "AVAILABLE" | "MAINTENANCE"): Promise<FleetOutcome> {
  await requireAdmin();
  return db().$transaction(async (tx) => {
    const truck = await lockTruck(tx, id);
    if (!truck) return { ok: false, error: GONE_TRUCK };
    const plate = formatPlate(truck.plate_number);
    if (truck.status === "ON_TRIP") return { ok: false, error: `${plate} is on a trip. End the trip first.` };
    if (status === "MAINTENANCE" && truck.loads > 0) {
      return { ok: false, error: `${plate} has ${truck.loads === 1 ? "a load" : `${truck.loads} loads`} on board. Take them off or move them first.` };
    }
    await tx.vehicle.update({ where: { id }, data: { status } });
    return { ok: true, message: status === "MAINTENANCE" ? `${plate} is in maintenance.` : `${plate} is available.` };
  });
}

export async function deleteVehicle(id: string): Promise<FleetOutcome> {
  await requireAdmin();
  return db().$transaction(async (tx) => {
    const truck = await lockTruck(tx, id);
    if (!truck) return { ok: false, error: GONE_TRUCK };
    const plate = formatPlate(truck.plate_number);
    if (truck.status === "ON_TRIP") return { ok: false, error: `${plate} is on a trip. End the trip first.` };
    if (truck.loads > 0) {
      return { ok: false, error: `${plate} has ${truck.loads === 1 ? "a load" : `${truck.loads} loads`} on board. Take them off or move them first.` };
    }
    // Past trips go with it; each request's timeline still records which truck it was on.
    await tx.vehicle.delete({ where: { id } });
    return { ok: true, message: `${plate} removed from the fleet.` };
  });
}

/**
 * Puts `kg` of a confirmed request on a truck. The request's row is locked first (as in
 * every function here), so two people placing the same request at once cannot place more
 * than it weighs.
 */
export async function assignLoad(quoteId: string, vehicleId: string, kg: number): Promise<FleetOutcome> {
  const admin = await requireAdmin();
  return db().$transaction(async (tx) => {
    const order = await lockOrder(tx, quoteId);
    if (!order) return { ok: false, error: "This request no longer exists." };
    if (order.status !== "CONFIRMED") return { ok: false, error: NOT_CONFIRMED };
    const remaining = order.quantity_kg - order.placed_kg;
    if (remaining <= 0) return { ok: false, error: `${order.reference} is already on trucks.` };
    if (kg > remaining) return { ok: false, error: `Only ${formatKg(remaining)} of ${order.reference} is left to place.` };

    const truck = await lockTruck(tx, vehicleId);
    if (!truck) return { ok: false, error: GONE_TRUCK };
    const plate = formatPlate(truck.plate_number);
    const refusal = cannotLoad(plate, truck.status);
    if (refusal) return { ok: false, error: refusal };

    await putOnTruck(tx, vehicleId, quoteId, kg);
    const over = overNote(truck.capacity_kg, truck.used_kg + kg);
    await tx.quoteActivity.create({
      data: { quoteRequestId: quoteId, authorId: admin.id, type: "ASSIGNMENT", body: `Placed ${formatKg(kg)} on ${plate}${over}` },
    });

    const left = remaining - kg;
    return {
      ok: true,
      message: `${formatKg(kg)} of ${order.reference} on ${plate}${over}.${left > 0 ? ` ${formatKg(left)} still to place.` : ""}`,
    };
  });
}

/** Takes a load off its truck. The request stays Confirmed and waits for a truck again. */
export async function unassignLoad(assignmentId: string): Promise<FleetOutcome> {
  const admin = await requireAdmin();
  return db().$transaction(async (tx) => {
    const assignment = await tx.truckAssignment.findUnique({
      where: { id: assignmentId },
      select: { quoteRequestId: true, loadKg: true, deliveredAt: true, vehicle: { select: { plateNumber: true } } },
    });
    if (!assignment || assignment.deliveredAt) return { ok: false, error: "That load is no longer on the truck." };
    const order = await lockOrder(tx, assignment.quoteRequestId);
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
    return { ok: true, message: `${order?.reference ?? "The load"} taken off ${plate}. It is waiting for a truck again.` };
  });
}

/** Moves a whole load from its truck to another. */
export async function moveLoad(assignmentId: string, toVehicleId: string): Promise<FleetOutcome> {
  const admin = await requireAdmin();
  return db().$transaction(async (tx) => {
    const assignment = await tx.truckAssignment.findUnique({
      where: { id: assignmentId },
      select: { quoteRequestId: true, vehicleId: true, loadKg: true, deliveredAt: true, vehicle: { select: { plateNumber: true } } },
    });
    if (!assignment || assignment.deliveredAt) return { ok: false, error: "That load is no longer on the truck." };
    if (assignment.vehicleId === toVehicleId) return { ok: false, error: "The load is already on that truck." };
    const order = await lockOrder(tx, assignment.quoteRequestId);
    if (!order) return { ok: false, error: "This request no longer exists." };

    const target = await lockTruck(tx, toVehicleId);
    if (!target) return { ok: false, error: GONE_TRUCK };
    const from = formatPlate(assignment.vehicle.plateNumber);
    const to = formatPlate(target.plate_number);
    const refusal = cannotLoad(to, target.status);
    if (refusal) return { ok: false, error: refusal };

    await tx.truckAssignment.delete({ where: { id: assignmentId } });
    await putOnTruck(tx, toVehicleId, assignment.quoteRequestId, assignment.loadKg);
    const over = overNote(target.capacity_kg, target.used_kg + assignment.loadKg);
    await tx.quoteActivity.create({
      data: {
        quoteRequestId: assignment.quoteRequestId,
        authorId: admin.id,
        type: "ASSIGNMENT",
        body: `Moved ${formatKg(assignment.loadKg)} from ${from} to ${to}${over}`,
      },
    });
    return { ok: true, message: `${order.reference} moved from ${from} to ${to}${over}.` };
  });
}

export async function startTrip(vehicleId: string): Promise<FleetOutcome> {
  const admin = await requireAdmin();
  return db().$transaction(async (tx) => {
    const truck = await lockTruck(tx, vehicleId);
    if (!truck) return { ok: false, error: GONE_TRUCK };
    const plate = formatPlate(truck.plate_number);
    if (truck.status !== "AVAILABLE") {
      return { ok: false, error: truck.status === "ON_TRIP" ? `${plate} is already on a trip.` : `${plate} is in maintenance.` };
    }
    if (truck.loads === 0) return { ok: false, error: `Nothing is on ${plate} yet.` };

    const loads = await tx.truckAssignment.findMany({
      where: { vehicleId, ...ON_BOARD },
      select: { quoteRequestId: true, loadKg: true },
    });
    await tx.vehicle.update({ where: { id: vehicleId }, data: { status: "ON_TRIP", tripStartedAt: new Date() } });
    await tx.quoteActivity.createMany({
      data: loads.map((load) => ({
        quoteRequestId: load.quoteRequestId,
        authorId: admin.id,
        type: "ASSIGNMENT" as const,
        body: `On the road: ${formatKg(load.loadKg)} on ${plate}`,
      })),
    });
    return { ok: true, message: `${plate} is on its trip with ${loads.length === 1 ? "1 load" : `${loads.length} loads`}.` };
  });
}

/**
 * Ends a trip: everything on board is delivered and the truck is empty and available again.
 * A request whose whole weight has now been delivered is marked Completed.
 */
export async function endTrip(vehicleId: string): Promise<FleetOutcome> {
  const admin = await requireAdmin();
  return db().$transaction(async (tx) => {
    // The requests on board are locked before the truck, the same order as everywhere else.
    const onBoard = await tx.truckAssignment.findMany({
      where: { vehicleId, deliveredAt: null },
      select: { id: true, quoteRequestId: true, loadKg: true },
    });
    const quoteIds = [...new Set(onBoard.map((load) => load.quoteRequestId))].sort();
    for (const quoteId of quoteIds) await lockOrder(tx, quoteId);

    const truck = await lockTruck(tx, vehicleId);
    if (!truck) return { ok: false, error: GONE_TRUCK };
    const plate = formatPlate(truck.plate_number);
    if (truck.status !== "ON_TRIP") return { ok: false, error: `${plate} is not on a trip.` };

    const now = new Date();
    await tx.truckAssignment.updateMany({ where: { id: { in: onBoard.map((load) => load.id) } }, data: { deliveredAt: now } });
    await tx.vehicle.update({ where: { id: vehicleId }, data: { status: "AVAILABLE", tripStartedAt: null } });

    const completed: string[] = [];
    for (const quoteId of quoteIds) {
      const delivered = onBoard.filter((load) => load.quoteRequestId === quoteId).reduce((sum, load) => sum + load.loadKg, 0);
      const [request, stillOnBoard, deliveredTotal] = await Promise.all([
        tx.quoteRequest.findUnique({ where: { id: quoteId }, select: { status: true, quantityKg: true, reference: true } }),
        tx.truckAssignment.count({ where: { quoteRequestId: quoteId, deliveredAt: null } }),
        tx.truckAssignment.aggregate({ where: { quoteRequestId: quoteId, deliveredAt: { not: null } }, _sum: { loadKg: true } }),
      ]);
      const activities: Prisma.QuoteActivityCreateManyInput[] = [
        { quoteRequestId: quoteId, authorId: admin.id, type: "ASSIGNMENT", body: `${formatKg(delivered)} delivered by ${plate}` },
      ];
      const done = request?.status === "CONFIRMED" && stillOnBoard === 0 && (deliveredTotal._sum.loadKg ?? 0) >= request.quantityKg;
      if (done) {
        await tx.quoteRequest.update({ where: { id: quoteId }, data: { status: "COMPLETED" } });
        activities.push({ quoteRequestId: quoteId, authorId: admin.id, type: "STATUS_CHANGE", body: "Status changed from Confirmed to Completed" });
        completed.push(request.reference);
      }
      await tx.quoteActivity.createMany({ data: activities });
    }

    const delivered = onBoard.length === 1 ? "1 load delivered" : `${onBoard.length} loads delivered`;
    return {
      ok: true,
      message: `${plate} is back: ${delivered}.${completed.length > 0 ? ` ${completed.join(", ")} marked Completed.` : ""}`,
    };
  });
}
