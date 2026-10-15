import { describe, expect, it } from "vitest";
import { assessPlacement, bestFitId, freeKg, overKg, type TruckState } from "./capacity";

function truck(id: string, capacityKg: number, extra: Partial<TruckState> = {}): TruckState {
  return { id, capacityKg, status: "AVAILABLE", usedKg: 0, temperature: null, bands: [], ...extra };
}

describe("assessPlacement", () => {
  it("allows going over the payload and says by how much", () => {
    expect(assessPlacement(truck("a", 4000, { usedKg: 3000, bands: ["FROZEN"] }), "FROZEN", 2500)).toEqual({
      blocked: null,
      afterKg: 5500,
      overKg: 1500,
      warnings: [],
    });
  });

  it("warns about a different band but does not block it", () => {
    const placement = assessPlacement(truck("a", 4000, { temperature: "CHILLED", bands: ["AMBIENT"] }), "FROZEN", 500);
    expect(placement.blocked).toBeNull();
    expect(placement.warnings).toEqual(["Set up for chilled", "Carrying ambient loads"]);
  });

  it("blocks trucks on a trip or in maintenance", () => {
    expect(assessPlacement(truck("a", 4000, { status: "ON_TRIP" }), "FROZEN", 1).blocked).toBe("On a trip");
    expect(assessPlacement(truck("a", 4000, { status: "MAINTENANCE" }), "FROZEN", 1).blocked).toBe("In maintenance");
  });
});

describe("bestFitId", () => {
  it("picks the tightest truck that takes the load whole, in the right band", () => {
    const trucks = [
      truck("big", 22000),
      truck("snug", 4000, { usedKg: 1000, bands: ["FROZEN"] }),
      truck("wrong-band", 4000, { temperature: "CHILLED" }),
      truck("away", 3000, { status: "ON_TRIP" }),
      truck("small", 2000),
    ];
    expect(bestFitId(trucks, "FROZEN", 2500)).toBe("snug");
    expect(bestFitId(trucks, "FROZEN", 30000)).toBeNull();
  });
});

describe("freeKg and overKg", () => {
  it("never go below zero", () => {
    expect(freeKg({ capacityKg: 4000, usedKg: 5000 })).toBe(0);
    expect(overKg({ capacityKg: 4000, usedKg: 5000 })).toBe(1000);
    expect(overKg({ capacityKg: 4000, usedKg: 100 })).toBe(0);
  });
});
