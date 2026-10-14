import type { CSSProperties } from "react";
import { BAND_STYLES } from "@/components/band-styles";
import type { MaterialId } from "@/config/materials";
import type { FleetLoad } from "@/features/fleet/types";
import { cn } from "@/lib/cn";

/** Hatched fill for a load that would go on the truck, in its band's colour. */
const PREVIEW: Record<MaterialId, string> = {
  FROZEN: "bg-[repeating-linear-gradient(135deg,var(--color-frozen)_0_5px,transparent_5px_10px)]",
  CHILLED: "bg-[repeating-linear-gradient(135deg,var(--color-chilled)_0_5px,transparent_5px_10px)]",
  AMBIENT: "bg-[repeating-linear-gradient(135deg,var(--color-ambient)_0_5px,transparent_5px_10px)]",
};

function percent(kg: number, of: number): string {
  return `${Math.max(0, Math.min(100, (kg / of) * 100))}%`;
}

/**
 * A reefer truck seen from the side: the box fills from the cab backwards with each load,
 * coloured by temperature band. `scale` (0 to 1) shortens the box for smaller trucks.
 */
export function TruckGraphic({
  capacityKg,
  loads,
  preview,
  maintenance,
  scale = 1,
  size = "sm",
}: {
  capacityKg: number;
  loads: FleetLoad[];
  /** A load about to be placed, drawn hatched after the others. */
  preview?: { kg: number; material: MaterialId } | null;
  maintenance?: boolean;
  scale?: number;
  size?: "sm" | "lg";
}) {
  const used = loads.reduce((sum, load) => sum + load.loadKg, 0);
  // An overloaded truck (payload lowered later) still draws every load, squeezed to fit.
  const scaleKg = Math.max(capacityKg, used + (preview?.kg ?? 0));
  const tall = size === "lg";

  return (
    <div aria-hidden="true" className="w-full">
      <div
        className="ml-auto flex w-(--truck-width) items-end transition-[width] duration-500"
        style={{ "--truck-width": `${Math.round(55 + 45 * scale)}%` } as CSSProperties}
      >
        {/* Box. The refrigeration unit sits on its front, next to the cab. */}
        <div
          className={cn(
            "relative flex flex-1 flex-row-reverse overflow-hidden rounded-l-md rounded-r-sm border border-frost-300 bg-frost-50",
            tall ? "h-20" : "h-12",
            maintenance && "bg-[repeating-linear-gradient(45deg,var(--color-frost-100)_0_6px,var(--color-frost-50)_6px_12px)]",
          )}
        >
          {loads.map((load) => (
            <div
              key={load.assignmentId}
              title={`${load.reference}, ${load.loadKg.toLocaleString("en-IN")} kg`}
              className={cn(
                "flex h-full w-(--w) shrink-0 items-center justify-center overflow-hidden border-l border-white/80 font-mono text-[0.65rem] font-semibold text-white transition-[width] duration-500 ease-out starting:w-0",
                BAND_STYLES[load.material].fill,
              )}
              style={{ "--w": percent(load.loadKg, scaleKg) } as CSSProperties}
            >
              {tall && load.loadKg / scaleKg > 0.18 ? <span className="truncate px-1">{load.reference}</span> : null}
            </div>
          ))}
          {preview && preview.kg > 0 ? (
            <div
              className={cn(
                "h-full w-(--w) shrink-0 animate-pulse border-l border-white/80 opacity-60 transition-[width] duration-300 starting:w-0",
                PREVIEW[preview.material],
              )}
              style={{ "--w": percent(preview.kg, scaleKg) } as CSSProperties}
            />
          ) : null}
        </div>
        {/* Refrigeration unit and cab. */}
        <div className={cn("flex flex-col justify-end", tall ? "w-12" : "w-8")}>
          <div className={cn("ml-0.5 rounded-sm bg-frost-300", tall ? "mb-auto h-4 w-2.5" : "mb-auto h-2.5 w-1.5")} />
          <div
            className={cn(
              "relative rounded-tr-xl rounded-br-sm bg-navy-900",
              tall ? "ml-1 h-14" : "ml-0.5 h-9",
              maintenance && "bg-ink-400",
            )}
          >
            <div className={cn("absolute right-1 rounded-tr-lg bg-ice-200", tall ? "top-2 h-5 w-6" : "top-1.5 h-3 w-4")} />
          </div>
        </div>
      </div>
      {/* Chassis and wheels. */}
      <div
        className="relative ml-auto h-1 w-(--truck-width) rounded-full bg-ink-300"
        style={{ "--truck-width": `${Math.round(55 + 45 * scale)}%` } as CSSProperties}
      >
        {["left-[8%]", "left-[20%]", "right-[4%]"].map((position) => (
          <span
            key={position}
            className={cn(
              "absolute top-0 rounded-full border-2 border-ink-800 bg-ink-500",
              tall ? "size-4" : "size-3",
              position,
            )}
          />
        ))}
      </div>
      <div className={tall ? "h-4" : "h-3"} />
    </div>
  );
}
