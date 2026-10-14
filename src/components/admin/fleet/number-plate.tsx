import { formatPlate } from "@/features/fleet/plate";
import { cn } from "@/lib/cn";

/** A registration plate drawn like an Indian high-security plate, with the blue IND strip. */
export function NumberPlate({ plate, size = "sm", className }: { plate: string; size?: "sm" | "lg"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-[5px] border-[1.5px] border-ink-950 bg-white font-mono font-bold whitespace-nowrap text-ink-950",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center bg-navy-800 font-sans font-semibold text-white",
          size === "lg" ? "px-1.5 text-[0.6rem]" : "px-1 text-[0.5rem]",
        )}
      >
        IND
      </span>
      <span className={cn("tracking-wider", size === "lg" ? "px-2.5 py-1 text-lg" : "px-1.5 py-px text-[0.8rem]")}>
        {formatPlate(plate)}
      </span>
    </span>
  );
}
