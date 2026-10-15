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
    lengthFt: null,
    tyres: null,
    status: "AVAILABLE",
    tripStartedAt: null,
    usedKg: 0,
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
  return {
    trucks,
    waiting,
    sizes: [{ capacityKg: 4000, name: null }, { capacityKg: 9000, name: null }],
    confirmedCount: waiting.length,
    today: "2026-10-14",
  };
}

describe("applyChange", () => {
  it("places exactly the weight chosen, even past the payload", () => {
    const next = applyChange(board([truck("1", 4000)], [order("A", 6000)]), { kind: "assign", quoteId: "A", truckId: "1", kg: 6000 });
    expect(next.trucks[0]).toMatchObject({ usedKg: 6000 });
    expect(next.waiting).toEqual([]);
  });

  it("keeps the rest of a split load waiting", () => {
    const next = applyChange(board([truck("1", 4000)], [order("A", 6000)]), { kind: "assign", quoteId: "A", truckId: "1", kg: 2500 });
    expect(next.waiting).toEqual([expect.objectContaining({ id: "A", assignedKg: 2500 })]);
  });

  it("puts a load back in the queue when it is taken off", () => {
    const placed = applyChange(board([truck("1", 9000)], [order("A", 6000)]), { kind: "assign", quoteId: "A", truckId: "1", kg: 6000 });
    const next = applyChange(placed, { kind: "unassign", assignmentId: placed.trucks[0].loads[0].assignmentId });
    expect(next.trucks[0]).toMatchObject({ usedKg: 0, loads: [] });
    expect(next.waiting).toEqual([expect.objectContaining({ id: "A", assignedKg: 0, quantityKg: 6000 })]);
  });

  it("moves a load to another truck, merging with what that request already has there", () => {
    const start = board([truck("1", 9000), truck("2", 9000)], [order("A", 6000)]);
    const split = applyChange(applyChange(start, { kind: "assign", quoteId: "A", truckId: "1", kg: 4000 }), {
      kind: "assign",
      quoteId: "A",
      truckId: "2",
      kg: 2000,
    });
    const next = applyChange(split, { kind: "move", assignmentId: split.trucks[0].loads[0].assignmentId, truckId: "2" });
    expect(next.trucks.map((item) => item.usedKg)).toEqual([0, 6000]);
    expect(next.trucks[1].loads).toHaveLength(1);
  });

  it("empties the truck when its trip ends", () => {
    const placed = applyChange(board([truck("1", 9000)], [order("A", 6000)]), { kind: "assign", quoteId: "A", truckId: "1", kg: 6000 });
    const onTrip = applyChange(placed, { kind: "start-trip", truckId: "1" });
    expect(onTrip.trucks[0].status).toBe("ON_TRIP");
    const back = applyChange(onTrip, { kind: "end-trip", truckId: "1" });
    expect(back.trucks[0]).toMatchObject({ status: "AVAILABLE", usedKg: 0, loads: [], tripStartedAt: null });
    expect(back.waiting).toEqual([]);
  });
});

describe("summarise and groupTrucks", () => {
  it("counts trips, maintenance and overweight trucks", () => {
    const summary = summarise(
      board(
        [
          truck("1", 4000, { usedKg: 5000 }),
          truck("2", 9000, { status: "MAINTENANCE" }),
          truck("3", 9000, { status: "ON_TRIP", usedKg: 3000 }),
        ],
        [order("A", 500)],
      ),
    );
    expect(summary).toMatchObject({ trucks: 3, available: 1, onTrip: 1, maintenance: 1, capacityKg: 13000, usedKg: 8000, onTripKg: 3000, overweight: 1, waitingKg: 500 });
  });

  it("keeps listed sizes with no trucks and adds unlisted payloads", () => {
    const groups = groupTrucks([truck("1", 7000)], [{ capacityKg: 4000, name: null }, { capacityKg: 9000, name: null }]);
    expect(groups.map((group) => [group.capacityKg, group.listed, group.trucks.length])).toEqual([
      [4000, true, 0],
      [7000, false, 1],
      [9000, true, 0],
    ]);
  });
});
