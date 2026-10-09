import { BAND_STYLES } from "@/components/band-styles";
import type { MaterialId } from "@/config/materials";
import { cn } from "@/lib/cn";
import { LOAD_TYPE_LABELS, formatCapacity, formatTrucks } from "@/lib/format";
import type { TruckPlan } from "@/lib/truck-plan";

function describe(plan: TruckPlan): string {
  const percent = Math.round(plan.fill * 100);
  const truckCount = plan.trucks.reduce((sum, truck) => sum + truck.count, 0);

  if (plan.loadType === "PART_LOAD") {
    return `Shares a ${formatCapacity(plan.totalCapacityKg)} truck with other cargo.`;
  }
  return truckCount === 1
    ? `Dedicated truck, ${percent}% of capacity used.`
    : `${truckCount} dedicated trucks, ${percent}% of capacity used.`;
}

/** Live preview of the vehicles a consignment would be planned on. */
export function TruckPlanReadout({
  id,
  plan,
  quantityKg,
  material,
}: {
  id: string;
  plan: TruckPlan | null;
  quantityKg: number | null;
  material: MaterialId;
}) {
  return (
    <div id={id} className="flex flex-col justify-center sm:mt-7">
      <div className="flex min-h-12 flex-col justify-center rounded-lg border border-frost-200 bg-frost-50 px-3.5 py-2.5">
        {plan ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-sm font-semibold text-ink-950">
                <span className="sr-only">Suggested vehicle: </span>
                {formatTrucks(plan.trucks)}
              </p>
              <p className="caption shrink-0 text-ink-500">{LOAD_TYPE_LABELS[plan.loadType]}</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-frost-200">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out",
                  BAND_STYLES[material].fill,
                )}
                style={{ width: `${Math.max(plan.fill * 100, 2)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-500">{describe(plan)}</p>
          </>
        ) : (
          <p className="text-sm text-ink-500">
            {quantityKg === null
              ? "Enter the weight to see the truck we would plan."
              : "That weight is outside what one request can cover."}
          </p>
        )}
      </div>
    </div>
  );
}
