import { cn } from "@/lib/cn";
import { formatCapacity } from "@/lib/format";
import type { TruckPlan } from "@/lib/truck-plan";

/**
 * The fleet drawn as a row of slots, smallest to largest, with the planned trucks lit up.
 * Shows a customer where their load sits in the fleet at a glance.
 */
export function FleetScale({
  capacitiesKg,
  plan,
  className,
}: {
  capacitiesKg: number[];
  plan: TruckPlan | null;
  className?: string;
}) {
  const counts = new Map(plan?.trucks.map((truck) => [truck.capacityKg, truck.count]));

  return (
    <div className={className}>
      <ol
        aria-label="Truck sizes in the fleet"
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${capacitiesKg.length}, minmax(0, 1fr))` }}
      >
        {capacitiesKg.map((capacityKg) => {
          const count = counts.get(capacityKg);
          return (
            <li
              key={capacityKg}
              aria-current={count ? "true" : undefined}
              className={cn(
                "relative flex h-6 items-center justify-center rounded-md font-mono text-[0.625rem] transition-colors",
                count ? "bg-navy-900 font-medium text-white" : "bg-frost-100 text-ink-500",
              )}
            >
              {formatCapacity(capacityKg).replace(" ", "")}
              {count && count > 1 ? (
                <span className="absolute -top-2 -right-1 rounded-md bg-saffron-500 px-1 font-mono text-[0.625rem] text-white ring-2 ring-white">
                  ×{count}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {plan ? (
        <div
          role="meter"
          aria-label="Share of the planned capacity used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(plan.fill * 100)}
          className="mt-1.5 h-1 overflow-hidden rounded-full bg-frost-200"
        >
          <div
            className="h-full rounded-full bg-ice-500 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(plan.fill * 100, 2)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
