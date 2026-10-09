import {
  DEDICATED_TRUCK_MIN_FILL,
  FLEET_CAPACITIES_KG,
  MAX_QUANTITY_KG,
  MIN_QUANTITY_KG,
} from "@/config/fleet";

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

const LARGEST_KG = FLEET_CAPACITIES_KG[FLEET_CAPACITIES_KG.length - 1];

function smallestTruckFor(quantityKg: number): number {
  return FLEET_CAPACITIES_KG.find((capacity) => capacity >= quantityKg) ?? LARGEST_KG;
}

/**
 * Suggests the vehicles for a consignment. This is a starting point for
 * dispatch, who confirm the final vehicle when they quote.
 *
 * Returns null when the quantity is not a whole number inside the accepted range.
 */
export function planTrucks(quantityKg: number): TruckPlan | null {
  if (
    !Number.isInteger(quantityKg) ||
    quantityKg < MIN_QUANTITY_KG ||
    quantityKg > MAX_QUANTITY_KG
  ) {
    return null;
  }

  if (quantityKg <= LARGEST_KG) {
    const capacityKg = smallestTruckFor(quantityKg);
    const fill = quantityKg / capacityKg;
    return {
      loadType: fill >= DEDICATED_TRUCK_MIN_FILL ? "FULL_LOAD" : "PART_LOAD",
      trucks: [{ capacityKg, count: 1 }],
      totalCapacityKg: capacityKg,
      fill,
    };
  }

  // Heavier than one truck: fill the largest size, then cover what is left.
  const largestCount = Math.floor(quantityKg / LARGEST_KG);
  const remainderKg = quantityKg - largestCount * LARGEST_KG;
  const trucks: TruckAllocation[] = [];

  if (remainderKg === 0) {
    trucks.push({ capacityKg: LARGEST_KG, count: largestCount });
  } else {
    const remainderTruckKg = smallestTruckFor(remainderKg);
    if (remainderTruckKg === LARGEST_KG) {
      trucks.push({ capacityKg: LARGEST_KG, count: largestCount + 1 });
    } else {
      trucks.push({ capacityKg: LARGEST_KG, count: largestCount });
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
