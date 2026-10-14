import { describe, expect, it } from "vitest";
import { parseVehicleForm } from "./vehicle-input";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseVehicleForm", () => {
  it("normalises the plate, payload and driver's number", () => {
    const result = parseVehicleForm(
      form({ plateNumber: " dl 01 la 4521 ", capacityKg: "22,000", model: "  Tata  Signa ", driverName: "", driverPhone: "098710 94268" }),
    );
    expect(result).toEqual({
      ok: true,
      value: { plateNumber: "DL01LA4521", capacityKg: 22000, model: "Tata Signa", driverName: null, driverPhone: "+919871094268" },
    });
  });

  it("explains what is wrong", () => {
    expect(parseVehicleForm(form({ plateNumber: "truck", capacityKg: "900" }))).toMatchObject({ ok: false });
    expect(parseVehicleForm(form({ plateNumber: "DL01LA4521", capacityKg: "" }))).toMatchObject({
      ok: false,
      error: "Choose the truck's payload.",
    });
    expect(parseVehicleForm(form({ plateNumber: "DL01LA4521", capacityKg: "900", driverPhone: "12345" }))).toMatchObject({
      ok: false,
    });
  });
});
