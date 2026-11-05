"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { refreshAdminData } from "@/features/auth/refresh-admin";
import { SITE_CONTENT_TAG } from "@/features/content/data";
import {
  addVehicle,
  approveLoadRequest,
  assignLoad,
  cancelLoadRequest,
  declineLoadRequest,
  deleteVehicle,
  endTrip,
  moveLoad,
  requestLoad,
  sendTrackingLink,
  setTruckTrackingLink,
  setVehicleStatus,
  startTrip,
  unassignLoad,
  updateVehicle,
  type FleetOutcome,
} from "./data";
import { sendDueTruckNotices } from "./notices";
import { parseTrackingUrl } from "./tracking";
import { parseVehicleForm } from "./vehicle-input";

// Server actions are public endpoints: every argument is checked here before use, and the
// functions in ./data check the session and who may do what (staff ask; admins do).

const BAD_REQUEST: FleetOutcome = { ok: false, error: "Something was missing. Reload the page and try again." };

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

/** Refreshes the page when something changed, so the board shows the saved state. */
function done(outcome: FleetOutcome): FleetOutcome {
  if (outcome.ok) refreshAdminData();
  return outcome;
}

/**
 * A load went on a truck: if its pickup is tomorrow or sooner the customer is told which truck
 * at once, rather than at the next morning's run. After the response, so the board stays quick.
 */
function placed(outcome: FleetOutcome): FleetOutcome {
  if (outcome.ok) after(() => sendDueTruckNotices());
  return done(outcome);
}

/** Also for the public site: the truck sizes it plans quotes with are the trucks' payloads. */
function trucksChanged(outcome: FleetOutcome): FleetOutcome {
  if (outcome.ok) updateTag(SITE_CONTENT_TAG);
  return done(outcome);
}

export async function addVehicleAction(formData: FormData): Promise<FleetOutcome> {
  const parsed = parseVehicleForm(formData);
  if (!parsed.ok) return parsed;
  return trucksChanged(await addVehicle(parsed.value));
}

export async function updateVehicleAction(id: string, formData: FormData): Promise<FleetOutcome> {
  if (!isId(id)) return BAD_REQUEST;
  const parsed = parseVehicleForm(formData);
  if (!parsed.ok) return parsed;
  return trucksChanged(await updateVehicle(id, parsed.value));
}

export async function setVehicleStatusAction(id: string, status: string): Promise<FleetOutcome> {
  if (!isId(id) || (status !== "AVAILABLE" && status !== "MAINTENANCE")) return BAD_REQUEST;
  return done(await setVehicleStatus(id, status));
}

export async function deleteVehicleAction(id: string): Promise<FleetOutcome> {
  if (!isId(id)) return BAD_REQUEST;
  return trucksChanged(await deleteVehicle(id));
}

function isLoadKg(kg: unknown): kg is number {
  return typeof kg === "number" && Number.isInteger(kg) && kg > 0 && kg <= 1_000_000;
}

const BAD_WEIGHT: FleetOutcome = { ok: false, error: "Enter the weight to load in whole kilograms." };

export async function assignLoadAction(quoteId: string, vehicleId: string, kg: number): Promise<FleetOutcome> {
  if (!isId(quoteId) || !isId(vehicleId)) return BAD_REQUEST;
  if (!isLoadKg(kg)) return BAD_WEIGHT;
  return placed(await assignLoad(quoteId, vehicleId, kg));
}

export async function requestLoadAction(quoteId: string, vehicleId: string, kg: number): Promise<FleetOutcome> {
  if (!isId(quoteId) || !isId(vehicleId)) return BAD_REQUEST;
  if (!isLoadKg(kg)) return BAD_WEIGHT;
  return done(await requestLoad(quoteId, vehicleId, kg));
}

export async function cancelLoadRequestAction(id: string): Promise<FleetOutcome> {
  if (!isId(id)) return BAD_REQUEST;
  return done(await cancelLoadRequest(id));
}

export async function approveLoadRequestAction(id: string): Promise<FleetOutcome> {
  if (!isId(id)) return BAD_REQUEST;
  return placed(await approveLoadRequest(id));
}

export async function declineLoadRequestAction(id: string): Promise<FleetOutcome> {
  if (!isId(id)) return BAD_REQUEST;
  return done(await declineLoadRequest(id));
}

export async function unassignLoadAction(assignmentId: string): Promise<FleetOutcome> {
  if (!isId(assignmentId)) return BAD_REQUEST;
  return done(await unassignLoad(assignmentId));
}

export async function moveLoadAction(assignmentId: string, toVehicleId: string): Promise<FleetOutcome> {
  if (!isId(assignmentId) || !isId(toVehicleId)) return BAD_REQUEST;
  return placed(await moveLoad(assignmentId, toVehicleId));
}

export async function startTripAction(vehicleId: string): Promise<FleetOutcome> {
  if (!isId(vehicleId)) return BAD_REQUEST;
  return done(await startTrip(vehicleId));
}

export async function endTripAction(vehicleId: string): Promise<FleetOutcome> {
  if (!isId(vehicleId)) return BAD_REQUEST;
  return done(await endTrip(vehicleId));
}

/** More customers than any truck carries. */
const MAX_RECIPIENTS = 50;

export async function sendTrackingLinkAction(vehicleId: string, url: string, quoteIds: string[]): Promise<FleetOutcome> {
  if (!isId(vehicleId) || !Array.isArray(quoteIds) || quoteIds.length === 0 || quoteIds.length > MAX_RECIPIENTS || !quoteIds.every(isId)) {
    return BAD_REQUEST;
  }
  const link = typeof url === "string" ? parseTrackingUrl(url) : null;
  if (!link) return { ok: false, error: "Paste the tracking link, starting with https://" };
  return done(await sendTrackingLink(vehicleId, link, quoteIds));
}

/** Saves a truck's live location link, or removes it when `url` is empty. */
export async function setTruckTrackingLinkAction(vehicleId: string, url: string): Promise<FleetOutcome> {
  if (!isId(vehicleId) || typeof url !== "string") return BAD_REQUEST;
  if (url.trim() === "") return done(await setTruckTrackingLink(vehicleId, null));
  const link = parseTrackingUrl(url);
  if (!link) return { ok: false, error: "Paste the tracking link, starting with https://" };
  return done(await setTruckTrackingLink(vehicleId, link));
}
