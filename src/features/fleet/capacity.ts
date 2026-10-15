import type { MaterialId } from "@/config/materials";

// How a load would sit on a truck. Pure, so the board, the truck picker and the tests share it.

export type TruckState = {
  id: string;
  capacityKg: number;
  status: "AVAILABLE" | "ON_TRIP" | "MAINTENANCE";
  usedKg: number;
  /** The band the truck is set up for, or null when not fixed. */
  temperature: MaterialId | null;
  /** Bands of the loads on board. */
  bands: MaterialId[];
};

export type Placement = {
  /** Why the truck cannot take loads right now, or null. */
  blocked: string | null;
  /** Weight on board after placing the load. */
  afterKg: number;
  /** How far over the payload that is; 0 when it fits. */
  overKg: number;
  /** Things the owner should know but may go ahead with. */
  warnings: string[];
};

export function freeKg(truck: Pick<TruckState, "capacityKg" | "usedKg">): number {
  return Math.max(0, truck.capacityKg - truck.usedKg);
}

export function overKg(truck: Pick<TruckState, "capacityKg" | "usedKg">): number {
  return Math.max(0, truck.usedKg - truck.capacityKg);
}

/** What placing `kg` of a load in band `material` on the truck would mean. */
export function assessPlacement(
  truck: TruckState,
  material: MaterialId,
  kg: number,
  bandLabel: (id: MaterialId) => string = (id) => id.toLowerCase(),
): Placement {
  const afterKg = truck.usedKg + kg;
  const warnings: string[] = [];
  if (truck.temperature !== null && truck.temperature !== material) {
    warnings.push(`Set up for ${bandLabel(truck.temperature)}`);
  }
  const others = [...new Set(truck.bands.filter((band) => band !== material))];
  if (others.length > 0) warnings.push(`Carrying ${others.map(bandLabel).join(" and ")} loads`);

  let blocked: string | null = null;
  if (truck.status === "ON_TRIP") blocked = "On a trip";
  if (truck.status === "MAINTENANCE") blocked = "In maintenance";

  return { blocked, afterKg, overKg: Math.max(0, afterKg - truck.capacityKg), warnings };
}

/**
 * The truck to suggest for a load: available, right band, takes it whole, least room left
 * over. Null when none fits. Only a suggestion; the owner picks.
 */
export function bestFitId(trucks: TruckState[], material: MaterialId, kg: number): string | null {
  let best: TruckState | null = null;
  for (const truck of trucks) {
    const placement = assessPlacement(truck, material, kg);
    if (placement.blocked || placement.overKg > 0 || placement.warnings.length > 0) continue;
    if (!best || freeKg(truck) < freeKg(best)) best = truck;
  }
  return best?.id ?? null;
}
