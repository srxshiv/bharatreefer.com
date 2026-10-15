import type { CSSProperties } from "react";
import { BAND_STYLES } from "@/components/band-styles";
import type { MaterialId } from "@/config/materials";
import type { FleetLoad, TruckStatus } from "@/features/fleet/types";
import { cn } from "@/lib/cn";

/** Hatched fill for a load about to be placed, in its band's colour. */
const PREVIEW: Record<MaterialId, string> = {
  FROZEN: "bg-[repeating-linear-gradient(135deg,var(--color-frozen)_0_5px,transparent_5px_10px)]",
  CHILLED: "bg-[repeating-linear-gradient(135deg,var(--color-chilled)_0_5px,transparent_5px_10px)]",
  AMBIENT: "bg-[repeating-linear-gradient(135deg,var(--color-ambient)_0_5px,transparent_5px_10px)]",
};

function percent(kg: number, of: number): string {
  return `${Math.max(0, Math.min(100, (kg / of) * 100))}%`;
}

/**
 * A reefer truck seen from the side. The box fills from the cab backwards with each load in
 * its band's colour. Past the payload the box keeps going, and the part over the limit is
 * marked red, so an overloaded truck shows how far over it is at a glance.
 */
export function TruckGraphic({
  capacityKg,
  loads,
  preview,
  status = "AVAILABLE",
  scale = 1,
  size = "sm",
}: {
  capacityKg: number;
  loads: Pick<FleetLoad, "assignmentId" | "loadKg" | "material" | "reference">[];
  /** A load about to be placed, drawn hatched after the others. */
  preview?: { kg: number; material: MaterialId } | null;
  status?: TruckStatus;
  /** 0 to 1: shortens the truck for smaller payloads. */
  scale?: number;
  size?: "xs" | "sm" | "lg";
}) {
  const used = loads.reduce((sum, load) => sum + load.loadKg, 0);
  const total = used + (preview?.kg ?? 0);
  const scaleKg = Math.max(capacityKg, total);
  const over = total > capacityKg;
  const tall = size === "lg";
  const tiny = size === "xs";
  const width = { "--truck-width": `${Math.round(55 + 45 * scale)}%` } as CSSProperties;

  return (
    <div aria-hidden="true" className="w-full">
      <div className="relative ml-auto flex w-(--truck-width) items-end transition-[width] duration-500" style={width}>
        {status === "ON_TRIP" ? (
          <div className="absolute top-1/2 -left-6 flex -translate-y-1/2 flex-col gap-1">
            {[0, 1, 2].map((line) => (
              <span key={line} className={cn("block h-0.5 rounded-full bg-ice-400/70", line === 1 ? "w-5" : "w-3.5")} />
            ))}
          </div>
        ) : null}
        <div
          className={cn(
            "relative flex flex-1 flex-row-reverse overflow-hidden rounded-l-md rounded-r-sm border bg-frost-50 dark:bg-[#123d70]",
            tall ? "h-20" : tiny ? "h-5" : "h-12",
            over ? "border-danger" : "border-frost-300",
            status === "MAINTENANCE" &&
              "bg-[repeating-linear-gradient(45deg,var(--color-frost-100)_0_6px,var(--color-frost-50)_6px_12px)]",
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
                "h-full w-(--w) shrink-0 border-l border-white/80 opacity-70 transition-[width] duration-300 starting:w-0",
                PREVIEW[preview.material],
              )}
              style={{ "--w": percent(preview.kg, scaleKg) } as CSSProperties}
            />
          ) : null}
          {over ? (
            // Everything left of the payload line is over the limit.
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-(--over) border-r-2 border-dashed border-danger bg-[repeating-linear-gradient(45deg,rgb(198_40_40/0.38)_0_4px,rgb(198_40_40/0.12)_4px_8px)]"
              style={{ "--over": percent(scaleKg - capacityKg, scaleKg) } as CSSProperties}
            />
          ) : null}
        </div>
        {/* Refrigeration unit and cab. */}
        <div className={cn("flex flex-col justify-end", tall ? "w-12" : tiny ? "w-4" : "w-8")}>
          {!tiny ? <div className={cn("ml-0.5 rounded-sm bg-frost-300", tall ? "mb-auto h-4 w-2.5" : "mb-auto h-2.5 w-1.5")} /> : null}
          <div
            className={cn(
              "relative rounded-tr-xl rounded-br-sm bg-navy-900",
              tall ? "ml-1 h-14" : tiny ? "ml-px h-4 rounded-tr-md" : "ml-0.5 h-9",
              status === "MAINTENANCE" && "bg-ink-400",
            )}
          >
            {!tiny ? <div className={cn("absolute right-1 rounded-tr-lg bg-ice-200", tall ? "top-2 h-5 w-6" : "top-1.5 h-3 w-4")} /> : null}
          </div>
        </div>
      </div>
      {!tiny ? (
        <>
          <div className="relative ml-auto h-1 w-(--truck-width) rounded-full bg-[#9aa8bc] dark:bg-[#5d7194]" style={width}>
            {["left-[8%]", "left-[20%]", "right-[4%]"].map((position) => (
              <span
                key={position}
                className={cn("absolute top-0 rounded-full border-2 border-[#1f3449] bg-[#5a6e8c] dark:border-[#0b1a31] dark:bg-[#8ba0c0]", tall ? "size-4" : "size-3", position)}
              />
            ))}
          </div>
          <div className={tall ? "h-4" : "h-3"} />
        </>
      ) : null}
    </div>
  );
}
