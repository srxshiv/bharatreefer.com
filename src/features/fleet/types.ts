import type { MaterialId } from "@/config/materials";
import type { TruckSizeInfo } from "@/features/content/types";

// Plain data shared by the server (./data) and the fleet board in the browser.

export type TruckStatus = "AVAILABLE" | "ON_TRIP" | "MAINTENANCE";

/**
 * Part or all of a confirmed request, on board a truck. Staff see every load's weight and
 * temperature, so they can tell how full a truck is, but only their own requests' details:
 * on anyone else's load `visible` is false and the request's fields are left empty.
 */
export type FleetLoad = {
  assignmentId: string;
  visible: boolean;
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
  /** Asked for by staff and waiting for an admin to approve. */
  requestedKg: number;
  originCity: string;
  destinationCity: string;
  pickupDate: string | null;
  contactName: string;
};

export type LoadRequestStatus = "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED";

/** A staff member's ask to put (part of) a confirmed request on a truck. */
export type FleetLoadRequest = {
  id: string;
  quoteId: string;
  reference: string;
  material: MaterialId;
  loadKg: number;
  truckId: string;
  plateNumber: string;
  /** Name of whoever asked, or null if their account is gone. */
  requestedBy: string | null;
  /** ISO timestamp. */
  createdAt: string;
  status: LoadRequestStatus;
  decidedBy: string | null;
};

export type FleetBoard = {
  /** Admins run the fleet. Staff see it, and ask for a truck for their own requests. */
  canManage: boolean;
  trucks: FleetTruck[];
  /** Confirmed requests still to place: every one for admins, their own for staff. */
  waiting: WaitingOrder[];
  /**
   * Asks waiting for an admin: everyone's for admins, their own for staff. Staff also see
   * their asks decided in the last week, so a declined one does not just disappear.
   */
  loadRequests: FleetLoadRequest[];
  /** Truck sizes listed in the website settings, ascending. */
  sizes: TruckSizeInfo[];
  confirmedCount: number;
  /** India date when the board was read, "YYYY-MM-DD", for flagging close pickups. */
  today: string;
};

export type FleetOutcome = { ok: true; message: string } | { ok: false; error: string };
