"use server";

import { refreshAdminData } from "@/features/auth/refresh-admin";
import {
  addVehicle,
  assignLoad,
  deleteVehicle,
  endTrip,
  moveLoad,
  setVehicleStatus,
  startTrip,
  unassignLoad,
  updateVehicle,
  type FleetOutcome,
} from "./data";
import { parseVehicleForm } from "./vehicle-input";

// Server actions are public endpoints: every argument is checked here before use, and the
// functions in ./data check the session.

const BAD_REQUEST: FleetOutcome = { ok: false, error: "Something was missing. Reload the page and try again." };

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

/** Refreshes the page when something changed, so the board shows the saved state. */
function done(outcome: FleetOutcome): FleetOutcome {
  if (outcome.ok) refreshAdminData();
  return outcome;
}

export async function addVehicleAction(formData: FormData): Promise<FleetOutcome> {
  const parsed = parseVehicleForm(formData);
  if (!parsed.ok) return parsed;
  return done(await addVehicle(parsed.value));
}

export async function updateVehicleAction(id: string, formData: FormData): Promise<FleetOutcome> {
  if (!isId(id)) return BAD_REQUEST;
  const parsed = parseVehicleForm(formData);
  if (!parsed.ok) return parsed;
  return done(await updateVehicle(id, parsed.value));
}

export async function setVehicleStatusAction(id: string, status: string): Promise<FleetOutcome> {
  if (!isId(id) || (status !== "AVAILABLE" && status !== "MAINTENANCE")) return BAD_REQUEST;
  return done(await setVehicleStatus(id, status));
}

export async function deleteVehicleAction(id: string): Promise<FleetOutcome> {
  if (!isId(id)) return BAD_REQUEST;
  return done(await deleteVehicle(id));
}

export async function assignLoadAction(quoteId: string, vehicleId: string, kg: number): Promise<FleetOutcome> {
  if (!isId(quoteId) || !isId(vehicleId)) return BAD_REQUEST;
  if (!(Number.isInteger(kg) && kg > 0 && kg <= 1_000_000)) return { ok: false, error: "Enter the weight to load in whole kilograms." };
  return done(await assignLoad(quoteId, vehicleId, kg));
}

export async function unassignLoadAction(assignmentId: string): Promise<FleetOutcome> {
  if (!isId(assignmentId)) return BAD_REQUEST;
  return done(await unassignLoad(assignmentId));
}

export async function moveLoadAction(assignmentId: string, toVehicleId: string): Promise<FleetOutcome> {
  if (!isId(assignmentId) || !isId(toVehicleId)) return BAD_REQUEST;
  return done(await moveLoad(assignmentId, toVehicleId));
}

export async function startTripAction(vehicleId: string): Promise<FleetOutcome> {
  if (!isId(vehicleId)) return BAD_REQUEST;
  return done(await startTrip(vehicleId));
}

export async function endTripAction(vehicleId: string): Promise<FleetOutcome> {
  if (!isId(vehicleId)) return BAD_REQUEST;
  return done(await endTrip(vehicleId));
}
