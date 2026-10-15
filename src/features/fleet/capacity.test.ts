import { describe, expect, it } from "vitest";
import { assessPlacement, bestFitId, freeKg, overKg, type TruckState } from "./capacity";

function truck(id: string, capacityKg: number, extra: Partial<TruckState> = {}): TruckState {
  return { id, capacityKg, status: "AVAILABLE", usedKg: 0, ...extra };
}

describe("assessPlacement", () => {
  it("allows going over the payload and says by how much", () => {
    expect(assessPlacement(truck("a", 4000, { usedKg: 3000 }), 2500)).toEqual({
      blocked: null,
      afterKg: 5500,
      overKg: 1500,
    });
  });

  it("blocks trucks on a trip or in maintenance", () => {
    expect(assessPlacement(truck("a", 4000, { status: "ON_TRIP" }), 1).blocked).toBe("On a trip");
    expect(assessPlacement(truck("a", 4000, { status: "MAINTENANCE" }), 1).blocked).toBe("In maintenance");
  });
});

describe("bestFitId", () => {
  it("picks the tightest available truck that takes the load whole", () => {
    const trucks = [
      truck("big", 22000),
      truck("roomy", 4000),
      truck("snug", 4000, { usedKg: 1000 }),
      truck("away", 3000, { status: "ON_TRIP" }),
      truck("small", 2000),
    ];
    expect(bestFitId(trucks, 2500)).toBe("snug");
    expect(bestFitId(trucks, 30000)).toBeNull();
  });
});

describe("freeKg and overKg", () => {
  it("never go below zero", () => {
    expect(freeKg({ capacityKg: 4000, usedKg: 5000 })).toBe(0);
    expect(overKg({ capacityKg: 4000, usedKg: 5000 })).toBe(1000);
    expect(overKg({ capacityKg: 4000, usedKg: 100 })).toBe(0);
  });
});
