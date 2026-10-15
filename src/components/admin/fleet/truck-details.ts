import type { FleetTruck } from "@/features/fleet/types";

/** "Tata 407 · 14 ft · 6 tyres · Meera Bansal": the facts about a truck worth a glance. */
export function truckDetails(truck: Pick<FleetTruck, "model" | "lengthFt" | "tyres" | "driverName">): string {
  return [
    truck.model,
    truck.lengthFt !== null ? `${truck.lengthFt.toLocaleString("en-IN")} ft` : null,
    truck.tyres !== null ? `${truck.tyres} tyres` : null,
    truck.driverName,
  ]
    .filter(Boolean)
    .join(" · ");
}
