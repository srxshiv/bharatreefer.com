import { largestTruckKg, type FleetConfig } from "@/config/fleet";

export type LoadTypeId = "FULL_LOAD" | "PART_LOAD";

export type TruckAllocation = {
  capacityKg: number;
  count: number;
};

export type TruckPlan = {
  loadType: LoadTypeId;
  /** Largest trucks first. */
  trucks: TruckAllocation[];
  totalCapacityKg: number;
  /** Share of the planned capacity the consignment uses, from 0 to 1. */
  fill: number;
};

function smallestTruckFor(quantityKg: number, fleet: FleetConfig): number {
  return fleet.capacitiesKg.find((capacity) => capacity >= quantityKg) ?? largestTruckKg(fleet);
}

/**
 * Suggests the vehicles for a consignment. This is a starting point for
 * dispatch, who confirm the final vehicle when they quote.
 *
 * Returns null when the quantity is not a whole number inside the accepted range.
 */
export function planTrucks(quantityKg: number, fleet: FleetConfig): TruckPlan | null {
  if (
    !Number.isInteger(quantityKg) ||
    quantityKg < fleet.minQuantityKg ||
    quantityKg > fleet.maxQuantityKg
  ) {
    return null;
  }

  const largestKg = largestTruckKg(fleet);

  if (quantityKg <= largestKg) {
    const capacityKg = smallestTruckFor(quantityKg, fleet);
    const fill = quantityKg / capacityKg;
    return {
      loadType: fill >= fleet.dedicatedFill ? "FULL_LOAD" : "PART_LOAD",
      trucks: [{ capacityKg, count: 1 }],
      totalCapacityKg: capacityKg,
      fill,
    };
  }

  // Heavier than one truck: fill the largest size, then cover what is left.
  const largestCount = Math.floor(quantityKg / largestKg);
  const remainderKg = quantityKg - largestCount * largestKg;
  const trucks: TruckAllocation[] = [];

  if (remainderKg === 0) {
    trucks.push({ capacityKg: largestKg, count: largestCount });
  } else {
    const remainderTruckKg = smallestTruckFor(remainderKg, fleet);
    if (remainderTruckKg === largestKg) {
      trucks.push({ capacityKg: largestKg, count: largestCount + 1 });
    } else {
      trucks.push({ capacityKg: largestKg, count: largestCount });
      trucks.push({ capacityKg: remainderTruckKg, count: 1 });
    }
  }

  const totalCapacityKg = trucks.reduce((sum, truck) => sum + truck.capacityKg * truck.count, 0);
  return {
    loadType: "FULL_LOAD",
    trucks,
    totalCapacityKg,
    fill: quantityKg / totalCapacityKg,
  };
}

/** Reads a truck plan stored as JSON, dropping anything that is not a well-formed entry. */
export function parseTruckPlan(stored: unknown): TruckAllocation[] {
  if (!Array.isArray(stored)) return [];
  return stored.filter(
    (entry): entry is TruckAllocation =>
      typeof entry === "object" &&
      entry !== null &&
      Number.isInteger((entry as TruckAllocation).capacityKg) &&
      Number.isInteger((entry as TruckAllocation).count),
  );
}
