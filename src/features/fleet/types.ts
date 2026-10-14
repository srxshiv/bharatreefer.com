import type { MaterialId } from "@/config/materials";
import type { TruckSizeInfo } from "@/features/content/types";

// Plain data shared by the server (./data) and the fleet board in the browser.

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
  status: "AVAILABLE" | "MAINTENANCE";
  usedKg: number;
  material: MaterialId | null;
  loads: FleetLoad[];
};

/** A confirmed request with weight still to place on a truck. */
export type WaitingOrder = {
  id: string;
  reference: string;
  material: MaterialId;
  quantityKg: number;
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
};

export type FleetOutcome = { ok: true; message: string } | { ok: false; error: string };
