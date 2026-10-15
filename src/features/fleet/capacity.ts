// How a load would sit on a truck. Pure, so the board, the truck picker and the tests share it.
// Any load can go on any truck: trucks have no temperature of their own, and loads of
// different temperatures can share one. Only weight and the truck's status matter.

export type TruckState = {
  id: string;
  capacityKg: number;
  status: "AVAILABLE" | "ON_TRIP" | "MAINTENANCE";
  usedKg: number;
};

export type Placement = {
  /** Why the truck cannot take loads right now, or null. */
  blocked: string | null;
  /** Weight on board after placing the load. */
  afterKg: number;
  /** How far over the payload that is; 0 when it fits. */
  overKg: number;
};

export function freeKg(truck: Pick<TruckState, "capacityKg" | "usedKg">): number {
  return Math.max(0, truck.capacityKg - truck.usedKg);
}

export function overKg(truck: Pick<TruckState, "capacityKg" | "usedKg">): number {
  return Math.max(0, truck.usedKg - truck.capacityKg);
}

/** What placing `kg` more on the truck would mean. */
export function assessPlacement(truck: TruckState, kg: number): Placement {
  const afterKg = truck.usedKg + kg;

  let blocked: string | null = null;
  if (truck.status === "ON_TRIP") blocked = "On a trip";
  if (truck.status === "MAINTENANCE") blocked = "In maintenance";

  return { blocked, afterKg, overKg: Math.max(0, afterKg - truck.capacityKg) };
}

/**
 * The truck to suggest for a load: available, takes it whole, least room left over. Null
 * when none fits. Only a suggestion; the owner picks.
 */
export function bestFitId(trucks: TruckState[], kg: number): string | null {
  let best: TruckState | null = null;
  for (const truck of trucks) {
    const placement = assessPlacement(truck, kg);
    if (placement.blocked || placement.overKg > 0) continue;
    if (!best || freeKg(truck) < freeKg(best)) best = truck;
  }
  return best?.id ?? null;
}
