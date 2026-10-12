import { describe, expect, it } from "vitest";
import { DEFAULT_FLEET } from "@/config/fleet";
import { formatTrucks } from "@/lib/format";
import { planTrucks } from "@/lib/truck-plan";

describe("planTrucks", () => {
  it("rejects quantities outside the accepted range", () => {
    expect(planTrucks(9, DEFAULT_FLEET)).toBeNull();
    expect(planTrucks(50_001, DEFAULT_FLEET)).toBeNull();
    expect(planTrucks(0, DEFAULT_FLEET)).toBeNull();
    expect(planTrucks(-500, DEFAULT_FLEET)).toBeNull();
  });

  it("rejects quantities that are not whole numbers", () => {
    expect(planTrucks(900.5, DEFAULT_FLEET)).toBeNull();
    expect(planTrucks(Number.NaN, DEFAULT_FLEET)).toBeNull();
    expect(planTrucks(Number.POSITIVE_INFINITY, DEFAULT_FLEET)).toBeNull();
  });

  it("gives a load that exactly fills a truck that truck as a full load", () => {
    expect(planTrucks(900, DEFAULT_FLEET)).toEqual({
      loadType: "FULL_LOAD",
      trucks: [{ capacityKg: 900, count: 1 }],
      totalCapacityKg: 900,
      fill: 1,
    });
  });

  it("picks the smallest truck that can carry the load", () => {
    expect(planTrucks(901, DEFAULT_FLEET)?.trucks).toEqual([{ capacityKg: 1500, count: 1 }]);
    expect(planTrucks(3500, DEFAULT_FLEET)?.trucks).toEqual([{ capacityKg: 4000, count: 1 }]);
    expect(planTrucks(22_000, DEFAULT_FLEET)?.trucks).toEqual([{ capacityKg: 22_000, count: 1 }]);
  });

  it("suggests a part load when the smallest truck would run under half full", () => {
    expect(planTrucks(10, DEFAULT_FLEET)?.loadType).toBe("PART_LOAD");
    expect(planTrucks(449, DEFAULT_FLEET)?.loadType).toBe("PART_LOAD");
    expect(planTrucks(450, DEFAULT_FLEET)?.loadType).toBe("FULL_LOAD");
  });

  it("splits loads heavier than the largest truck across several", () => {
    const plan = planTrucks(50_000, DEFAULT_FLEET);
    expect(plan?.loadType).toBe("FULL_LOAD");
    expect(plan?.trucks).toEqual([
      { capacityKg: 22_000, count: 2 },
      { capacityKg: 7000, count: 1 },
    ]);
    expect(plan?.totalCapacityKg).toBe(51_000);
    expect(plan?.fill).toBeCloseTo(50_000 / 51_000);
  });

  it("merges the remainder into the largest size when it needs one", () => {
    expect(planTrucks(44_000, DEFAULT_FLEET)?.trucks).toEqual([{ capacityKg: 22_000, count: 2 }]);
    expect(planTrucks(40_000, DEFAULT_FLEET)?.trucks).toEqual([{ capacityKg: 22_000, count: 2 }]);
  });

  it("always plans enough capacity for the load", () => {
    for (let quantity = 10; quantity <= 50_000; quantity += 37) {
      const plan = planTrucks(quantity, DEFAULT_FLEET);
      expect(plan).not.toBeNull();
      expect(plan!.totalCapacityKg).toBeGreaterThanOrEqual(quantity);
      expect(plan!.fill).toBeGreaterThan(0);
      expect(plan!.fill).toBeLessThanOrEqual(1);
    }
  });
});

describe("formatTrucks", () => {
  it("reads the way dispatch would say it", () => {
    expect(formatTrucks([{ capacityKg: 900, count: 1 }])).toBe("1 × 900 kg");
    expect(
      formatTrucks([
        { capacityKg: 22_000, count: 2 },
        { capacityKg: 1500, count: 1 },
      ]),
    ).toBe("2 × 22 t + 1 × 1.5 t");
  });
});

describe("planTrucks with an edited fleet", () => {
  const fleet = { capacitiesKg: [1000, 5000], minQuantityKg: 50, maxQuantityKg: 12_000, dedicatedFill: 0.3 };

  it("uses the configured sizes, limits and part-load threshold", () => {
    expect(planTrucks(49, fleet)).toBeNull();
    expect(planTrucks(299, fleet)?.loadType).toBe("PART_LOAD");
    expect(planTrucks(300, fleet)?.loadType).toBe("FULL_LOAD");
    expect(planTrucks(4000, fleet)?.trucks).toEqual([{ capacityKg: 5000, count: 1 }]);
    expect(planTrucks(11_000, fleet)?.trucks).toEqual([
      { capacityKg: 5000, count: 2 },
      { capacityKg: 1000, count: 1 },
    ]);
    expect(planTrucks(12_001, fleet)).toBeNull();
  });
});
