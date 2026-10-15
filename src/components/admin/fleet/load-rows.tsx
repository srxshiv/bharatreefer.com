"use client";

import { ArrowRight } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import type { FleetLoad } from "@/features/fleet/types";
import { cn } from "@/lib/cn";
import { formatKg } from "@/lib/format";
import { IntentLink } from "../intent-link";

const rowButton =
  "inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40";

/** The loads on a truck, each with what it is and buttons to move it or take it off. */
export function LoadRows({
  loads,
  bandLabels,
  onMove,
  onRemove,
  className,
}: {
  loads: FleetLoad[];
  bandLabels: Record<FleetLoad["material"], string>;
  onMove: (load: FleetLoad, anchor: HTMLElement) => void;
  onRemove: (load: FleetLoad) => void;
  className?: string;
}) {
  return (
    <ul className={cn("divide-y divide-frost-200", className)}>
      {loads.map((load) => {
        const saving = load.assignmentId.startsWith("pending-");
        const part = load.loadKg < load.quantityKg;
        return (
          <li key={load.assignmentId} className="flex items-center gap-2.5 py-2">
            <span aria-hidden="true" className={cn("h-8 w-1 shrink-0 rounded-full", BAND_STYLES[load.material].fill)} />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2">
                <IntentLink
                  href={`/admin/quotes/${load.quoteId}`}
                  className="font-mono text-xs font-semibold text-ink-950 hover:text-ice-700"
                >
                  {load.reference}
                </IntentLink>
                <span className="font-mono text-xs font-semibold text-ink-950">{formatKg(load.loadKg)}</span>
                {part ? <span className="text-[0.7rem] text-ink-500">of {formatKg(load.quantityKg)}</span> : null}
              </p>
              <p className="truncate text-[0.7rem] text-ink-500">
                {load.originCity} <ArrowRight aria-label="to" className="inline size-3" /> {load.destinationCity} ·{" "}
                {bandLabels[load.material]} · {load.contactName}
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={(event) => onMove(load, event.currentTarget)}
              className={cn(rowButton, "text-ice-700 hover:bg-ice-50")}
            >
              Move
              <span className="sr-only"> {load.reference} to another truck</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onRemove(load)}
              className={cn(rowButton, "text-ink-500 hover:bg-danger-soft hover:text-danger")}
            >
              Remove
              <span className="sr-only"> {load.reference} from this truck</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
