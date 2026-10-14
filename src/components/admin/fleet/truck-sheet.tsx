"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle, Phone, Trash2, Wrench } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import type { MaterialId } from "@/config/materials";
import type { TruckSizeInfo } from "@/features/content/types";
import { deleteVehicleAction, updateVehicleAction } from "@/features/fleet/actions";
import type { FleetOutcome, FleetTruck } from "@/features/fleet/types";
import { cn } from "@/lib/cn";
import { formatIsoDate } from "@/lib/dates";
import { formatCapacity, formatKg } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { secondaryButton } from "../ui";
import { NumberPlate } from "./number-plate";
import { TruckForm } from "./truck-form";
import { TruckGraphic } from "./truck-graphic";

const smallButton =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-frost-300 bg-white px-3 text-sm font-medium text-ink-900 transition-colors hover:border-ink-400 disabled:opacity-50";

export function TruckSheetTitle({ truck }: { truck: FleetTruck }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <NumberPlate plate={truck.plateNumber} size="lg" />
      <span className="text-sm text-ink-500">{formatCapacity(truck.capacityKg)} payload</span>
    </div>
  );
}

/** Everything about one truck: what it carries, its status, its details. */
export function TruckSheetBody({
  truck,
  sizes,
  bands,
  onUnassign,
  onStatus,
  onDone,
  notify,
}: {
  truck: FleetTruck;
  sizes: TruckSizeInfo[];
  bands: Record<MaterialId, { label: string }>;
  onUnassign: (assignmentId: string) => void;
  onStatus: (status: FleetTruck["status"]) => void;
  onDone: () => void;
  notify: (outcome: FleetOutcome) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const percent = Math.round((truck.usedKg / truck.capacityKg) * 100);
  const free = Math.max(0, truck.capacityKg - truck.usedKg);

  function remove() {
    startDelete(async () => {
      try {
        const outcome = await deleteVehicleAction(truck.id);
        notify(outcome);
        if (outcome.ok) onDone();
      } catch {
        notify({ ok: false, error: "Could not remove the truck. Check your connection and try again." });
      }
    });
  }

  return (
    <div className="space-y-7">
      <section>
        <TruckGraphic capacityKg={truck.capacityKg} loads={truck.loads} maintenance={truck.status === "MAINTENANCE"} size="lg" />
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-ink-700">
            <span className="font-mono font-semibold text-ink-950">{formatKg(truck.usedKg)}</span> of {formatKg(truck.capacityKg)}
          </p>
          <p className="font-mono text-sm text-ink-500">{truck.status === "MAINTENANCE" ? "In maintenance" : `${percent}% · ${formatKg(free)} free`}</p>
        </div>
      </section>

      <section>
        <h3 className="caption text-ink-500">Status</h3>
        <div role="radiogroup" aria-label="Status" className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-frost-100 p-1">
          {(["AVAILABLE", "MAINTENANCE"] as const).map((status) => {
            const active = truck.status === status;
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => !active && onStatus(status)}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all",
                  active ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-950",
                )}
              >
                {status === "AVAILABLE" ? (
                  <span aria-hidden="true" className="size-2 rounded-full bg-success" />
                ) : (
                  <Wrench aria-hidden="true" className="size-4" />
                )}
                {status === "AVAILABLE" ? "Available" : "In maintenance"}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="caption text-ink-500">
          On board {truck.loads.length > 0 ? <span className="font-mono">({truck.loads.length})</span> : null}
        </h3>
        {truck.loads.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-frost-300 px-4 py-5 text-center text-sm text-ink-500">
            Empty. Pick a confirmed request on the fleet page, then tap this truck.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-frost-200 rounded-xl border border-frost-200">
            {truck.loads.map((load) => (
              <li key={load.assignmentId} className="flex items-center gap-3 px-4 py-3">
                <span aria-hidden="true" className={cn("h-9 w-1 shrink-0 rounded-full", BAND_STYLES[load.material].fill)} />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/quotes/${load.quoteId}`} className="font-mono text-sm font-semibold text-ink-950 hover:text-ice-700">
                    {load.reference}
                  </Link>
                  <p className="truncate text-xs text-ink-500">
                    {load.originCity} <ArrowRight aria-label="to" className="inline size-3" /> {load.destinationCity} · {bands[load.material].label}
                    {load.pickupDate ? ` · ${formatIsoDate(load.pickupDate)}` : ""}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold whitespace-nowrap text-ink-950">{formatKg(load.loadKg)}</span>
                <button
                  type="button"
                  onClick={() => onUnassign(load.assignmentId)}
                  disabled={load.assignmentId.startsWith("pending-")}
                  className="inline-flex h-8 items-center rounded-md px-2 text-xs font-semibold text-ink-500 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                >
                  Take off
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {truck.driverName || truck.driverPhone ? (
        <section>
          <h3 className="caption text-ink-500">Driver</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="font-medium text-ink-950">
              {truck.driverName ?? "Driver"}
              {truck.driverPhone ? <span className="ml-2 font-mono text-sm font-normal text-ink-500">{formatIndianMobile(truck.driverPhone)}</span> : null}
            </p>
            {truck.driverPhone ? (
              <div className="flex gap-2">
                <a href={`tel:${truck.driverPhone}`} className={smallButton}>
                  <Phone aria-hidden="true" className="size-4" />
                  Call
                </a>
                <a href={whatsappLink(truck.driverPhone, "")} target="_blank" rel="noopener noreferrer" className={smallButton}>
                  <MessageCircle aria-hidden="true" className="size-4" />
                  WhatsApp
                </a>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <details className="group rounded-xl border border-frost-200">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink-950 [&::-webkit-details-marker]:hidden">
          Edit details
          <span aria-hidden="true" className="text-ink-400 transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="border-t border-frost-200 p-4">
          <TruckForm
            key={`${truck.plateNumber}:${truck.capacityKg}:${truck.model}:${truck.driverName}:${truck.driverPhone}`}
            truck={truck}
            sizes={sizes}
            submitLabel="Save truck"
            onSubmit={(formData) => updateVehicleAction(truck.id, formData)}
            onSaved={(message) => notify({ ok: true, message })}
          />
        </div>
      </details>

      <section className="border-t border-frost-200 pt-5">
        {confirmDelete ? (
          <div className="rounded-xl bg-danger-soft p-4">
            <p className="text-sm font-medium text-ink-950">Remove this truck from the fleet?</p>
            <p className="mt-1 text-sm text-ink-700">Its past trips are dropped. Request timelines keep a record.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleting ? "Removing" : "Yes, remove"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={secondaryButton.replace("h-11", "h-10")}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-danger hover:underline"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Remove truck
          </button>
        )}
      </section>
    </div>
  );
}
