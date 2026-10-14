import { describe, expect, it } from "vitest";
import { blockedReason, planAllocation, rankTrucks, type TruckLoad } from "./capacity";

function truck(id: string, capacityKg: number, usedKg = 0, extra: Partial<TruckLoad> = {}): TruckLoad {
  return { id, plateNumber: id, capacityKg, usedKg, status: "AVAILABLE", material: usedKg > 0 ? "FROZEN" : null, ...extra };
}

describe("rankTrucks", () => {
  it("prefers the tightest truck that takes the whole load", () => {
    const fleet = [truck("big", 22_000), truck("mid", 9_000), truck("small", 4_000)];
    expect(rankTrucks(fleet, "FROZEN", 3_500).map((t) => t.id)).toEqual(["small", "mid", "big"]);
    expect(rankTrucks(fleet, "FROZEN", 8_000).map((t) => t.id)).toEqual(["mid", "big", "small"]);
  });

  it("skips trucks in maintenance, full ones, and ones carrying another band", () => {
    const fleet = [
      truck("repair", 9_000, 0, { status: "MAINTENANCE" }),
      truck("full", 4_000, 4_000),
      truck("chilled", 9_000, 2_000, { material: "CHILLED" }),
      truck("ok", 9_000, 2_000),
    ];
    expect(rankTrucks(fleet, "FROZEN", 1_000).map((t) => t.id)).toEqual(["ok"]);
    expect(blockedReason(fleet[0], "FROZEN")).toBe("In maintenance");
    expect(blockedReason(fleet[1], "FROZEN")).toBe("Full");
    expect(blockedReason(fleet[2], "FROZEN")).toBe("Carrying a different temperature band");
    expect(blockedReason(fleet[3], "FROZEN")).toBeNull();
  });
});

describe("planAllocation", () => {
  it("fits a load on one truck when it can", () => {
    expect(planAllocation([truck("a", 16_000), truck("b", 9_000)], "CHILLED", 8_500)).toEqual([{ truckId: "b", loadKg: 8_500 }]);
  });

  it("spreads a heavy load across trucks, roomiest first", () => {
    expect(planAllocation([truck("a", 22_000), truck("b", 22_000), truck("c", 9_000)], "FROZEN", 44_000)).toEqual([
      { truckId: "a", loadKg: 22_000 },
      { truckId: "b", loadKg: 22_000 },
    ]);
  });

  it("shares a part-loaded truck in the same band", () => {
    expect(planAllocation([truck("shared", 9_000, 6_000), truck("empty", 9_000)], "FROZEN", 2_000)).toEqual([
      { truckId: "shared", loadKg: 2_000 },
    ]);
  });

  it("places what it can when the fleet runs out", () => {
    expect(planAllocation([truck("a", 4_000)], "FROZEN", 10_000)).toEqual([{ truckId: "a", loadKg: 4_000 }]);
    expect(planAllocation([], "FROZEN", 10_000)).toEqual([]);
  });
});
