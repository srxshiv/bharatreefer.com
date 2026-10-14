import type { MaterialId } from "@/config/materials";

/** A truck with what is already on it. */
export type TruckLoad = {
  id: string;
  plateNumber: string;
  capacityKg: number;
  status: "AVAILABLE" | "MAINTENANCE";
  usedKg: number;
  /** Temperature band of what is on board, or null when empty. One band per truck. */
  material: MaterialId | null;
};

export type Allocation = { truckId: string; loadKg: number };

export function freeKg(truck: TruckLoad): number {
  return Math.max(0, truck.capacityKg - truck.usedKg);
}

/** Whether a load in this temperature band can go on the truck at all. */
export function canCarry(truck: TruckLoad, material: MaterialId): boolean {
  return truck.status === "AVAILABLE" && freeKg(truck) > 0 && (truck.material === null || truck.material === material);
}

/** Why a truck cannot take a load, for showing next to it. Null when it can. */
export function blockedReason(truck: TruckLoad, material: MaterialId): string | null {
  if (truck.status === "MAINTENANCE") return "In maintenance";
  if (freeKg(truck) === 0) return "Full";
  if (truck.material !== null && truck.material !== material) return "Carrying a different temperature band";
  return null;
}

/**
 * Orders trucks for a load: first those that take the whole remainder in one go, tightest
 * fit first (so big trucks stay free for big loads), then the roomiest of the rest.
 */
export function rankTrucks(trucks: TruckLoad[], material: MaterialId, remainingKg: number): TruckLoad[] {
  const usable = trucks.filter((truck) => canCarry(truck, material));
  const whole = usable
    .filter((truck) => freeKg(truck) >= remainingKg)
    .sort((a, b) => freeKg(a) - freeKg(b) || a.plateNumber.localeCompare(b.plateNumber));
  const partial = usable
    .filter((truck) => freeKg(truck) < remainingKg)
    .sort((a, b) => freeKg(b) - freeKg(a) || a.plateNumber.localeCompare(b.plateNumber));
  return [...whole, ...partial];
}

/**
 * Spreads a load over the fleet using `rankTrucks`, one truck at a time, until it is placed
 * or no truck can take more. Returns what it placed; anything left over is unplaced.
 */
export function planAllocation(trucks: TruckLoad[], material: MaterialId, kg: number): Allocation[] {
  const state = trucks.map((truck) => ({ ...truck }));
  const allocations: Allocation[] = [];
  let remaining = kg;
  while (remaining > 0) {
    const [best] = rankTrucks(
      state.filter((truck) => !allocations.some((allocation) => allocation.truckId === truck.id)),
      material,
      remaining,
    );
    if (!best) break;
    const loadKg = Math.min(remaining, freeKg(best));
    allocations.push({ truckId: best.id, loadKg });
    best.usedKg += loadKg;
    best.material = material;
    remaining -= loadKg;
  }
  return allocations;
}
