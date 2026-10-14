import { freeKg, planAllocation, type TruckLoad } from "./capacity";
import type { FleetBoard, FleetLoad, FleetTruck, WaitingOrder } from "./types";

/** A change made on the board, applied straight away while the server catches up. */
export type BoardChange =
  | { kind: "assign"; quoteId: string; truckId: string }
  | { kind: "auto"; quoteId: string }
  | { kind: "unassign"; assignmentId: string }
  | { kind: "status"; truckId: string; status: FleetTruck["status"] };

export function remainingKg(order: WaitingOrder): number {
  return order.quantityKg - order.assignedKg;
}

export function asTruckLoad(truck: FleetTruck): TruckLoad {
  return {
    id: truck.id,
    plateNumber: truck.plateNumber,
    capacityKg: truck.capacityKg,
    status: truck.status,
    usedKg: truck.usedKg,
    material: truck.material,
  };
}

/** How much of the order goes on the truck when it is tapped: as much as fits. */
export function placeableKg(truck: FleetTruck, order: WaitingOrder): number {
  return Math.min(remainingKg(order), freeKg(asTruckLoad(truck)));
}

let pendingIds = 0;

function place(board: FleetBoard, order: WaitingOrder, truckId: string, kg: number): FleetBoard {
  if (kg <= 0) return board;
  const load: FleetLoad = {
    assignmentId: `pending-${++pendingIds}`,
    quoteId: order.id,
    reference: order.reference,
    loadKg: kg,
    quantityKg: order.quantityKg,
    material: order.material,
    originCity: order.originCity,
    destinationCity: order.destinationCity,
    pickupDate: order.pickupDate,
    contactName: order.contactName,
  };
  const trucks = board.trucks.map((truck) => {
    if (truck.id !== truckId) return truck;
    const existing = truck.loads.find((item) => item.quoteId === order.id);
    const loads = existing
      ? truck.loads.map((item) => (item === existing ? { ...item, loadKg: item.loadKg + kg } : item))
      : [...truck.loads, load];
    return { ...truck, loads, usedKg: truck.usedKg + kg, material: order.material };
  });
  const waiting = board.waiting
    .map((item) => (item.id === order.id ? { ...item, assignedKg: item.assignedKg + kg } : item))
    .filter((item) => remainingKg(item) > 0);
  return { ...board, trucks, waiting };
}

export function applyChange(board: FleetBoard, change: BoardChange): FleetBoard {
  switch (change.kind) {
    case "assign": {
      const order = board.waiting.find((item) => item.id === change.quoteId);
      const truck = board.trucks.find((item) => item.id === change.truckId);
      if (!order || !truck) return board;
      return place(board, order, truck.id, placeableKg(truck, order));
    }
    case "auto": {
      const order = board.waiting.find((item) => item.id === change.quoteId);
      if (!order) return board;
      const plan = planAllocation(board.trucks.map(asTruckLoad), order.material, remainingKg(order));
      let next = board;
      for (const { truckId, loadKg } of plan) {
        const current = next.waiting.find((item) => item.id === order.id);
        if (!current) break;
        next = place(next, current, truckId, loadKg);
      }
      return next;
    }
    case "unassign": {
      const truck = board.trucks.find((item) => item.loads.some((load) => load.assignmentId === change.assignmentId));
      const load = truck?.loads.find((item) => item.assignmentId === change.assignmentId);
      if (!truck || !load) return board;

      const trucks = board.trucks.map((item) => {
        if (item !== truck) return item;
        const loads = item.loads.filter((other) => other !== load);
        return { ...item, loads, usedKg: item.usedKg - load.loadKg, material: loads[0]?.material ?? null };
      });
      const listed = board.waiting.find((item) => item.id === load.quoteId);
      const waiting = listed
        ? board.waiting.map((item) => (item === listed ? { ...item, assignedKg: item.assignedKg - load.loadKg } : item))
        : insertByPickup(board.waiting, {
            id: load.quoteId,
            reference: load.reference,
            material: load.material,
            quantityKg: load.quantityKg,
            assignedKg: load.quantityKg - load.loadKg,
            originCity: load.originCity,
            destinationCity: load.destinationCity,
            pickupDate: load.pickupDate,
            contactName: load.contactName,
          });
      return { ...board, trucks, waiting };
    }
    case "status":
      return {
        ...board,
        trucks: board.trucks.map((truck) => (truck.id === change.truckId ? { ...truck, status: change.status } : truck)),
      };
  }
}

/** Keeps the queue in pickup order (undated last), as the server sends it. */
function insertByPickup(waiting: WaitingOrder[], order: WaitingOrder): WaitingOrder[] {
  const key = (item: WaitingOrder) => item.pickupDate ?? "9999-12-31";
  const index = waiting.findIndex((item) => key(item) > key(order));
  return index === -1 ? [...waiting, order] : [...waiting.slice(0, index), order, ...waiting.slice(index)];
}

export type FleetSummary = {
  trucks: number;
  available: number;
  maintenance: number;
  /** Payload of the available trucks. */
  capacityKg: number;
  usedKg: number;
  freeKg: number;
  emptyTrucks: number;
  waitingOrders: number;
  waitingKg: number;
};

export function summarise(board: FleetBoard): FleetSummary {
  const available = board.trucks.filter((truck) => truck.status === "AVAILABLE");
  return {
    trucks: board.trucks.length,
    available: available.length,
    maintenance: board.trucks.length - available.length,
    capacityKg: available.reduce((sum, truck) => sum + truck.capacityKg, 0),
    usedKg: board.trucks.reduce((sum, truck) => sum + truck.usedKg, 0),
    freeKg: available.reduce((sum, truck) => sum + freeKg(asTruckLoad(truck)), 0),
    emptyTrucks: available.filter((truck) => truck.usedKg === 0).length,
    waitingOrders: board.waiting.length,
    waitingKg: board.waiting.reduce((sum, order) => sum + remainingKg(order), 0),
  };
}

export type CapacityGroup = {
  capacityKg: number;
  name: string | null;
  /** False for trucks whose payload is no longer one of the listed sizes. */
  listed: boolean;
  trucks: FleetTruck[];
};

/** One group per listed truck size, plus any payloads only a truck still has, ascending. */
export function groupTrucks(board: FleetBoard): CapacityGroup[] {
  const groups = new Map<number, CapacityGroup>();
  for (const size of board.sizes) {
    groups.set(size.capacityKg, { capacityKg: size.capacityKg, name: size.name, listed: true, trucks: [] });
  }
  for (const truck of board.trucks) {
    const group = groups.get(truck.capacityKg) ?? { capacityKg: truck.capacityKg, name: null, listed: false, trucks: [] };
    group.trucks.push(truck);
    groups.set(truck.capacityKg, group);
  }
  return [...groups.values()].sort((a, b) => a.capacityKg - b.capacityKg);
}
