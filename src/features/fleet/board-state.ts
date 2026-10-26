import { overKg, type TruckState } from "./capacity";
import type { FleetBoard, FleetLoad, FleetLoadRequest, FleetTruck, WaitingOrder } from "./types";

/** A change made on the board, shown straight away while the server catches up. */
export type BoardChange =
  | { kind: "assign"; quoteId: string; truckId: string; kg: number }
  /** Staff ask for a truck. */
  | { kind: "request"; quoteId: string; truckId: string; kg: number }
  /** An admin approves an ask: the load goes on its truck. */
  | { kind: "approve"; requestId: string }
  /** An ask declined or withdrawn. */
  | { kind: "drop-request"; requestId: string }
  | { kind: "unassign"; assignmentId: string }
  | { kind: "move"; assignmentId: string; truckId: string }
  | { kind: "status"; truckId: string; status: FleetTruck["status"] }
  | { kind: "start-trip"; truckId: string }
  | { kind: "end-trip"; truckId: string };

export function remainingKg(order: WaitingOrder): number {
  return order.quantityKg - order.assignedKg;
}

/** What staff can still ask a truck for: what is left to place, less what is already asked for. */
export function askableKg(order: WaitingOrder): number {
  return remainingKg(order) - order.requestedKg;
}

/** Changes how much of an order is waiting for approval. */
function adjustRequested(waiting: WaitingOrder[], quoteId: string, kg: number): WaitingOrder[] {
  return waiting.map((item) => (item.id === quoteId ? { ...item, requestedKg: Math.max(0, item.requestedKg + kg) } : item));
}

/** What the placement rules need to know about a truck. */
export function truckState(truck: FleetTruck): TruckState {
  return {
    id: truck.id,
    capacityKg: truck.capacityKg,
    status: truck.status,
    usedKg: truck.usedKg,
  };
}

let pendingIds = 0;

/** Adds a load to a truck, merging with the same request's load already on it. */
function addLoad(truck: FleetTruck, load: FleetLoad): FleetTruck {
  const existing = truck.loads.find((item) => item.quoteId === load.quoteId);
  const loads = existing
    ? truck.loads.map((item) => (item === existing ? { ...item, loadKg: item.loadKg + load.loadKg } : item))
    : [...truck.loads, load];
  return { ...truck, loads, usedKg: truck.usedKg + load.loadKg };
}

function removeLoad(truck: FleetTruck, assignmentId: string): FleetTruck {
  const load = truck.loads.find((item) => item.assignmentId === assignmentId);
  if (!load) return truck;
  return { ...truck, loads: truck.loads.filter((item) => item !== load), usedKg: truck.usedKg - load.loadKg };
}

/** Keeps the queue in pickup order (undated last), as the server sends it. */
function insertByPickup(waiting: WaitingOrder[], order: WaitingOrder): WaitingOrder[] {
  const key = (item: WaitingOrder) => item.pickupDate ?? "9999-12-31";
  const index = waiting.findIndex((item) => key(item) > key(order));
  return index === -1 ? [...waiting, order] : [...waiting.slice(0, index), order, ...waiting.slice(index)];
}

function findLoad(board: FleetBoard, assignmentId: string): { truck: FleetTruck; load: FleetLoad } | null {
  for (const truck of board.trucks) {
    const load = truck.loads.find((item) => item.assignmentId === assignmentId);
    if (load) return { truck, load };
  }
  return null;
}

export function applyChange(board: FleetBoard, change: BoardChange): FleetBoard {
  switch (change.kind) {
    case "assign": {
      const order = board.waiting.find((item) => item.id === change.quoteId);
      if (!order || change.kg <= 0) return board;
      const load: FleetLoad = {
        assignmentId: `pending-${++pendingIds}`,
        visible: true,
        quoteId: order.id,
        reference: order.reference,
        loadKg: change.kg,
        quantityKg: order.quantityKg,
        material: order.material,
        originCity: order.originCity,
        destinationCity: order.destinationCity,
        pickupDate: order.pickupDate,
        contactName: order.contactName,
      };
      return {
        ...board,
        trucks: board.trucks.map((truck) => (truck.id === change.truckId ? addLoad(truck, load) : truck)),
        waiting: board.waiting
          .map((item) => (item.id === order.id ? { ...item, assignedKg: item.assignedKg + change.kg } : item))
          .filter((item) => remainingKg(item) > 0),
      };
    }
    case "unassign": {
      const found = findLoad(board, change.assignmentId);
      if (!found) return board;
      const { load } = found;
      const listed = board.waiting.find((item) => item.id === load.quoteId);
      return {
        ...board,
        trucks: board.trucks.map((truck) => (truck === found.truck ? removeLoad(truck, change.assignmentId) : truck)),
        waiting: listed
          ? board.waiting.map((item) => (item === listed ? { ...item, assignedKg: item.assignedKg - load.loadKg } : item))
          : insertByPickup(board.waiting, {
              id: load.quoteId,
              reference: load.reference,
              material: load.material,
              quantityKg: load.quantityKg,
              assignedKg: load.quantityKg - load.loadKg,
              requestedKg: 0,
              originCity: load.originCity,
              destinationCity: load.destinationCity,
              pickupDate: load.pickupDate,
              contactName: load.contactName,
            }),
      };
    }
    case "move": {
      const found = findLoad(board, change.assignmentId);
      if (!found || found.truck.id === change.truckId) return board;
      return {
        ...board,
        trucks: board.trucks.map((truck) => {
          if (truck === found.truck) return removeLoad(truck, change.assignmentId);
          if (truck.id === change.truckId) return addLoad(truck, { ...found.load, assignmentId: `pending-${++pendingIds}` });
          return truck;
        }),
      };
    }
    case "request": {
      const order = board.waiting.find((item) => item.id === change.quoteId);
      const truck = board.trucks.find((item) => item.id === change.truckId);
      if (!order || !truck || change.kg <= 0) return board;
      const request: FleetLoadRequest = {
        id: `pending-${++pendingIds}`,
        quoteId: order.id,
        reference: order.reference,
        material: order.material,
        loadKg: change.kg,
        truckId: truck.id,
        plateNumber: truck.plateNumber,
        requestedBy: null,
        createdAt: new Date().toISOString(),
        status: "PENDING",
        decidedBy: null,
      };
      return {
        ...board,
        loadRequests: [...board.loadRequests, request],
        waiting: adjustRequested(board.waiting, order.id, change.kg),
      };
    }
    case "approve": {
      const request = board.loadRequests.find((item) => item.id === change.requestId);
      if (!request) return board;
      const placed = applyChange(
        { ...board, waiting: adjustRequested(board.waiting, request.quoteId, -request.loadKg) },
        { kind: "assign", quoteId: request.quoteId, truckId: request.truckId, kg: request.loadKg },
      );
      return { ...placed, loadRequests: placed.loadRequests.filter((item) => item !== request) };
    }
    case "drop-request": {
      const request = board.loadRequests.find((item) => item.id === change.requestId);
      if (!request) return board;
      return {
        ...board,
        loadRequests: board.loadRequests.filter((item) => item !== request),
        waiting: adjustRequested(board.waiting, request.quoteId, -request.loadKg),
      };
    }
    case "status":
      return {
        ...board,
        trucks: board.trucks.map((truck) => (truck.id === change.truckId ? { ...truck, status: change.status } : truck)),
      };
    case "start-trip":
      return {
        ...board,
        trucks: board.trucks.map((truck) =>
          truck.id === change.truckId ? { ...truck, status: "ON_TRIP", tripStartedAt: new Date().toISOString() } : truck,
        ),
      };
    case "end-trip":
      return {
        ...board,
        trucks: board.trucks.map((truck) =>
          truck.id === change.truckId ? { ...truck, status: "AVAILABLE", tripStartedAt: null, loads: [], usedKg: 0 } : truck,
        ),
      };
  }
}

export type FleetSummary = {
  trucks: number;
  available: number;
  onTrip: number;
  maintenance: number;
  /** Payload of the trucks not in maintenance. */
  capacityKg: number;
  usedKg: number;
  onTripKg: number;
  overweight: number;
  emptyTrucks: number;
  waitingOrders: number;
  waitingKg: number;
};

export function summarise(board: FleetBoard): FleetSummary {
  const running = board.trucks.filter((truck) => truck.status !== "MAINTENANCE");
  return {
    trucks: board.trucks.length,
    available: board.trucks.filter((truck) => truck.status === "AVAILABLE").length,
    onTrip: board.trucks.filter((truck) => truck.status === "ON_TRIP").length,
    maintenance: board.trucks.filter((truck) => truck.status === "MAINTENANCE").length,
    capacityKg: running.reduce((sum, truck) => sum + truck.capacityKg, 0),
    usedKg: board.trucks.reduce((sum, truck) => sum + truck.usedKg, 0),
    onTripKg: board.trucks.filter((truck) => truck.status === "ON_TRIP").reduce((sum, truck) => sum + truck.usedKg, 0),
    overweight: board.trucks.filter((truck) => overKg(truck) > 0).length,
    emptyTrucks: board.trucks.filter((truck) => truck.status === "AVAILABLE" && truck.usedKg === 0).length,
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
export function groupTrucks(trucks: FleetTruck[], sizes: FleetBoard["sizes"]): CapacityGroup[] {
  const groups = new Map<number, CapacityGroup>();
  for (const size of sizes) {
    groups.set(size.capacityKg, { capacityKg: size.capacityKg, name: size.name, listed: true, trucks: [] });
  }
  for (const truck of trucks) {
    const group = groups.get(truck.capacityKg) ?? { capacityKg: truck.capacityKg, name: null, listed: false, trucks: [] };
    group.trucks.push(truck);
    groups.set(truck.capacityKg, group);
  }
  return [...groups.values()].sort((a, b) => a.capacityKg - b.capacityKg);
}
