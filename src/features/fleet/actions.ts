"use server";

import { refresh } from "next/cache";
import {
  addVehicle,
  assignLoad,
  autoAssignLoad,
  deleteVehicle,
  setVehicleStatus,
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
  if (outcome.ok) refresh();
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

export async function assignLoadAction(quoteId: string, vehicleId: string, kg?: number): Promise<FleetOutcome> {
  if (!isId(quoteId) || !isId(vehicleId)) return BAD_REQUEST;
  if (kg !== undefined && !(Number.isInteger(kg) && kg > 0 && kg <= 1_000_000)) return BAD_REQUEST;
  return done(await assignLoad(quoteId, vehicleId, kg));
}

export async function autoAssignLoadAction(quoteId: string): Promise<FleetOutcome> {
  if (!isId(quoteId)) return BAD_REQUEST;
  return done(await autoAssignLoad(quoteId));
}

export async function unassignLoadAction(assignmentId: string): Promise<FleetOutcome> {
  if (!isId(assignmentId)) return BAD_REQUEST;
  return done(await unassignLoad(assignmentId));
}
