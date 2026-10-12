/**
 * Fleet and consignment limits. Editable in the admin panel; these are the defaults.
 * The truck planner, the quote form's validation and the page copy all read from one of these.
 */
export type FleetConfig = {
  /** Payload capacity of each truck size, in kilograms, ascending. Never empty. */
  capacitiesKg: number[];
  /** Smallest and largest consignment accepted through the quote form, in kilograms. */
  minQuantityKg: number;
  maxQuantityKg: number;
  /**
   * A consignment gets a dedicated truck when it fills at least this share (0 to 1) of the
   * smallest truck that can carry it. Anything lighter is suggested as a part load.
   */
  dedicatedFill: number;
};

export const DEFAULT_TRUCK_CAPACITIES_KG = [900, 1500, 2500, 4000, 7000, 9000, 16000, 22000];

export const DEFAULT_FLEET: FleetConfig = {
  capacitiesKg: DEFAULT_TRUCK_CAPACITIES_KG,
  minQuantityKg: 10,
  maxQuantityKg: 50_000,
  dedicatedFill: 0.5,
};

export function smallestTruckKg(fleet: FleetConfig): number {
  return fleet.capacitiesKg[0];
}

export function largestTruckKg(fleet: FleetConfig): number {
  return fleet.capacitiesKg[fleet.capacitiesKg.length - 1];
}
