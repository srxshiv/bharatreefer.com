/**
 * Fleet and consignment limits. The truck planner and the quote form both read
 * from here, so changing a number updates validation, the plan and the copy.
 */

/** Payload capacity of each reefer size in the fleet, in kilograms, ascending. */
export const FLEET_CAPACITIES_KG = [
  900, 1500, 2500, 4000, 7000, 9000, 16000, 22000,
] as const;

/** Smallest and largest consignment accepted through the quote form, in kilograms. */
export const MIN_QUANTITY_KG = 10;
export const MAX_QUANTITY_KG = 50_000;

/**
 * A consignment gets a dedicated truck when it fills at least this share of the
 * smallest truck that can carry it. Anything lighter is suggested as a part load.
 */
export const DEDICATED_TRUCK_MIN_FILL = 0.5;
