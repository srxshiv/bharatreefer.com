import type { MaterialId } from "@/config/materials";
import type { TruckSizeInfo } from "@/features/content/types";

// Plain data shared by the server (./data) and the fleet board in the browser.

export type TruckStatus = "AVAILABLE" | "ON_TRIP" | "MAINTENANCE";

/** Part or all of a confirmed request, on board a truck. */
export type FleetLoad = {
  assignmentId: string;
  quoteId: string;
  reference: string;
  loadKg: number;
  /** The whole request's weight, of which `loadKg` is on this truck. */
  quantityKg: number;
  material: MaterialId;
  originCity: string;
  destinationCity: string;
  /** ISO date, or null when the customer gave none. */
  pickupDate: string | null;
  contactName: string;
};

export type FleetTruck = {
  id: string;
  plateNumber: string;
  capacityKg: number;
  model: string | null;
  driverName: string | null;
  driverPhone: string | null;
  /** The band the truck is set up for, or null when not fixed. */
  temperature: MaterialId | null;
  lengthFt: number | null;
  tyres: number | null;
  status: TruckStatus;
  /** ISO timestamp, while on a trip. */
  tripStartedAt: string | null;
  /** Weight on board. Can exceed the payload: the owner decides. */
  usedKg: number;
  loads: FleetLoad[];
};

/** A confirmed request with weight not yet on a truck. */
export type WaitingOrder = {
  id: string;
  reference: string;
  material: MaterialId;
  quantityKg: number;
  /** On trucks now or already delivered. */
  assignedKg: number;
  originCity: string;
  destinationCity: string;
  pickupDate: string | null;
  contactName: string;
};

export type FleetBoard = {
  trucks: FleetTruck[];
  waiting: WaitingOrder[];
  /** Truck sizes listed in the website settings, ascending. */
  sizes: TruckSizeInfo[];
  confirmedCount: number;
  /** India date when the board was read, "YYYY-MM-DD", for flagging close pickups. */
  today: string;
};

export type FleetOutcome = { ok: true; message: string } | { ok: false; error: string };
