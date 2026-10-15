"use client";

import { useState } from "react";
import { Flag, Play } from "lucide-react";
import type { FleetTruck } from "@/features/fleet/types";
import { cn } from "@/lib/cn";
import { formatShortDateTimeInIndia } from "@/lib/dates";

/** "Since 14 Oct, 2:05 pm", in India time, written the same by the server and every browser. */
export function tripSince(iso: string): string {
  return `Since ${formatShortDateTimeInIndia(new Date(iso))}`;
}

/**
 * Starts a trip for a loaded truck, or ends the one it is on. Ending asks first, since it
 * delivers every load on board and can mark requests Completed.
 */
export function TripButton({
  truck,
  onStart,
  onEnd,
  className,
}: {
  truck: FleetTruck;
  onStart: () => void;
  onEnd: () => void;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (truck.status === "MAINTENANCE") return null;

  if (truck.status === "AVAILABLE") {
    return (
      <button
        type="button"
        disabled={truck.loads.length === 0}
        onClick={onStart}
        title={truck.loads.length === 0 ? "Load the truck first" : undefined}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-navy-800 disabled:bg-frost-200 disabled:text-ink-400",
          className,
        )}
      >
        <Play aria-hidden="true" className="size-3.5" />
        Start trip
      </button>
    );
  }

  if (confirming) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className="text-xs text-ink-700">
          Deliver {truck.loads.length === 1 ? "its load" : `all ${truck.loads.length} loads`}?
        </span>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onEnd();
          }}
          className="inline-flex h-9 items-center rounded-lg bg-leaf-600 px-3 text-xs font-semibold text-white hover:bg-[#08652c]"
        >
          End trip
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex h-9 items-center rounded-lg px-2 text-xs font-semibold text-ink-500 hover:text-ink-950"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-success/40 bg-success-soft px-3 text-xs font-semibold text-success transition-colors hover:border-success",
        className,
      )}
    >
      <Flag aria-hidden="true" className="size-3.5" />
      End trip
    </button>
  );
}
