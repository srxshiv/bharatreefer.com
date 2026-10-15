import { isMaterialId, type MaterialId } from "@/config/materials";
import { normaliseIndianMobile } from "@/lib/phone";
import { normalisePlate } from "./plate";

export type VehicleInput = {
  plateNumber: string;
  capacityKg: number;
  model: string | null;
  driverName: string | null;
  /** E.164 */
  driverPhone: string | null;
  temperature: MaterialId | null;
  lengthFt: number | null;
  tyres: number | null;
};

export const MIN_VEHICLE_KG = 100;
export const MAX_VEHICLE_KG = 60_000;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/** Reads and checks the add/edit truck form. */
export function parseVehicleForm(
  formData: FormData,
): { ok: true; value: VehicleInput } | { ok: false; error: string } {
  const plateNumber = normalisePlate(text(formData, "plateNumber"));
  if (!plateNumber) {
    return { ok: false, error: "Enter the registration as printed on the plate, for example DL 01 LA 4521." };
  }

  const capacity = text(formData, "capacityKg").replace(/[,\s]/g, "");
  const capacityKg = /^\d{1,6}$/.test(capacity) ? Number(capacity) : NaN;
  if (!(capacityKg >= MIN_VEHICLE_KG && capacityKg <= MAX_VEHICLE_KG)) {
    return { ok: false, error: "Choose the truck's payload." };
  }

  const model = text(formData, "model");
  const driverName = text(formData, "driverName");
  if (model.length > 60) return { ok: false, error: "Keep the model under 60 characters." };
  if (driverName.length > 60) return { ok: false, error: "Keep the driver's name under 60 characters." };

  const rawPhone = text(formData, "driverPhone");
  const driverPhone = rawPhone ? normaliseIndianMobile(rawPhone) : null;
  if (rawPhone && !driverPhone) {
    return { ok: false, error: "Enter the driver's 10-digit mobile number, or leave it empty." };
  }

  const band = text(formData, "temperature");
  if (band && !isMaterialId(band)) return { ok: false, error: "Choose the truck's temperature." };

  const rawLength = text(formData, "lengthFt").replace(/\s*(ft|feet|')\s*$/i, "");
  const lengthFt = rawLength ? Number(rawLength) : null;
  if (lengthFt !== null && !(Number.isFinite(lengthFt) && lengthFt >= 4 && lengthFt <= 60)) {
    return { ok: false, error: "Enter the body length in feet, between 4 and 60, or leave it empty." };
  }

  const rawTyres = text(formData, "tyres");
  const tyres = rawTyres ? Number(rawTyres) : null;
  if (tyres !== null && !(Number.isInteger(tyres) && tyres >= 3 && tyres <= 30)) {
    return { ok: false, error: "Enter the number of tyres, between 3 and 30, or leave it empty." };
  }

  return {
    ok: true,
    value: {
      plateNumber,
      capacityKg,
      model: model || null,
      driverName: driverName || null,
      driverPhone,
      temperature: band ? (band as MaterialId) : null,
      lengthFt: lengthFt === null ? null : Math.round(lengthFt * 10) / 10,
      tyres,
    },
  };
}
