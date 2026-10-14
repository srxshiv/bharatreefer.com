import { describe, expect, it } from "vitest";
import { applyChange, groupTrucks, summarise } from "./board-state";
import type { FleetBoard, FleetTruck, WaitingOrder } from "./types";

function truck(id: string, capacityKg: number, extra: Partial<FleetTruck> = {}): FleetTruck {
  return {
    id,
    plateNumber: `DL01AA${id.padStart(4, "0")}`,
    capacityKg,
    model: null,
    driverName: null,
    driverPhone: null,
    status: "AVAILABLE",
    usedKg: 0,
    material: null,
    loads: [],
    ...extra,
  };
}

function order(id: string, quantityKg: number, extra: Partial<WaitingOrder> = {}): WaitingOrder {
  return {
    id,
    reference: `BR-${id}`,
    material: "FROZEN",
    quantityKg,
    assignedKg: 0,
    originCity: "Delhi",
    destinationCity: "Mumbai",
    pickupDate: null,
    contactName: "Asha",
    ...extra,
  };
}

function board(trucks: FleetTruck[], waiting: WaitingOrder[]): FleetBoard {
  return { trucks, waiting, sizes: [{ capacityKg: 4000, name: null }, { capacityKg: 9000, name: null }], confirmedCount: waiting.length };
}

describe("applyChange", () => {
  it("places as much as fits and keeps the rest waiting", () => {
    const next = applyChange(board([truck("1", 4000)], [order("A", 6000)]), { kind: "assign", quoteId: "A", truckId: "1" });
    expect(next.trucks[0]).toMatchObject({ usedKg: 4000, material: "FROZEN" });
    expect(next.waiting).toEqual([expect.objectContaining({ id: "A", assignedKg: 4000 })]);
  });

  it("removes an order from the queue once it is fully placed", () => {
    const next = applyChange(board([truck("1", 9000)], [order("A", 6000)]), { kind: "assign", quoteId: "A", truckId: "1" });
    expect(next.waiting).toEqual([]);
    expect(next.trucks[0].loads).toHaveLength(1);
  });

  it("spreads an order over trucks when placed automatically", () => {
    const next = applyChange(board([truck("1", 4000), truck("2", 4000)], [order("A", 7000)]), { kind: "auto", quoteId: "A" });
    expect(next.trucks.map((item) => item.usedKg)).toEqual([4000, 3000]);
    expect(next.waiting).toEqual([]);
  });

  it("puts a load back in the queue when it is taken off", () => {
    const placed = applyChange(board([truck("1", 9000)], [order("A", 6000)]), { kind: "assign", quoteId: "A", truckId: "1" });
    const assignmentId = placed.trucks[0].loads[0].assignmentId;
    const next = applyChange(placed, { kind: "unassign", assignmentId });
    expect(next.trucks[0]).toMatchObject({ usedKg: 0, material: null, loads: [] });
    expect(next.waiting).toEqual([expect.objectContaining({ id: "A", assignedKg: 0, quantityKg: 6000 })]);
  });
});

describe("summarise and groupTrucks", () => {
  it("counts only available trucks towards capacity", () => {
    const summary = summarise(board([truck("1", 4000, { usedKg: 1000, material: "FROZEN" }), truck("2", 9000, { status: "MAINTENANCE" })], [order("A", 500)]));
    expect(summary).toMatchObject({ trucks: 2, available: 1, maintenance: 1, capacityKg: 4000, usedKg: 1000, freeKg: 3000, waitingKg: 500 });
  });

  it("keeps listed sizes with no trucks and adds unlisted payloads", () => {
    const groups = groupTrucks(board([truck("1", 7000)], []));
    expect(groups.map((group) => [group.capacityKg, group.listed, group.trucks.length])).toEqual([
      [4000, true, 0],
      [7000, false, 1],
      [9000, true, 0],
    ]);
  });
});
