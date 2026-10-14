import type { LoadTypeId, TruckAllocation } from "@/lib/truck-plan";

const kgFormatter = new Intl.NumberFormat("en-IN");
const tonneFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** Exact weight in kilograms with Indian digit grouping: 12500 -> "12,500 kg". */
export function formatKg(kg: number): string {
  return `${kgFormatter.format(kg)} kg`;
}

/** Truck capacity in the unit people say out loud: 900 -> "900 kg", 1500 -> "1.5 t". */
export function formatCapacity(kg: number): string {
  return kg < 1000 ? `${kg} kg` : `${tonneFormatter.format(kg / 1000)} t`;
}

/** "2 × 22 t + 1 × 7 t" */
export function formatTrucks(trucks: TruckAllocation[]): string {
  return trucks
    .map((truck) => `${truck.count} × ${formatCapacity(truck.capacityKg)}`)
    .join(" + ");
}

export const LOAD_TYPE_LABELS: Record<LoadTypeId, string> = {
  FULL_LOAD: "Full load",
  PART_LOAD: "Part load",
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Whole rupees with Indian digit grouping: 148500 -> "₹1,48,500". */
export function formatInr(rupees: number): string {
  return inrFormatter.format(rupees);
}

const inrShortFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumSignificantDigits: 3,
});

/** Rupees for totals: exact below a lakh, then in lakh and crore: 485000 -> "₹4.85L". */
export function formatInrShort(rupees: number): string {
  return rupees < 100_000 ? formatInr(rupees) : inrShortFormatter.format(rupees);
}
