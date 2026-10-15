"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Phone, Trash2, Wrench } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import type { MaterialId } from "@/config/materials";
import type { TruckSizeInfo } from "@/features/content/types";
import { deleteVehicleAction, updateVehicleAction } from "@/features/fleet/actions";
import { overKg } from "@/features/fleet/capacity";
import type { FleetLoad, FleetOutcome, FleetTruck } from "@/features/fleet/types";
import { cn } from "@/lib/cn";
import { formatCapacity, formatKg } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { secondaryButton } from "../ui";
import { LoadRows } from "./load-rows";
import { NumberPlate } from "./number-plate";
import { TripButton, tripSince } from "./trip-button";
import { TruckForm } from "./truck-form";
import { TruckGraphic } from "./truck-graphic";

const smallButton =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-frost-300 bg-surface px-3 text-sm font-medium text-ink-900 transition-colors hover:border-ink-400 disabled:opacity-50";

export function TruckSheetTitle({ truck }: { truck: FleetTruck }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <NumberPlate plate={truck.plateNumber} size="lg" />
      <span className="text-sm text-ink-500">{formatCapacity(truck.capacityKg)} payload</span>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink-950">{children}</dd>
    </div>
  );
}

/** Everything about one truck: what it carries, its trip, its status, its details. */
export function TruckSheetBody({
  truck,
  sizes,
  bandLabels,
  onMove,
  onRemove,
  onStatus,
  onStartTrip,
  onEndTrip,
  onDone,
  notify,
}: {
  truck: FleetTruck;
  sizes: TruckSizeInfo[];
  bandLabels: Record<MaterialId, string>;
  onMove: (load: FleetLoad, anchor: HTMLElement) => void;
  onRemove: (load: FleetLoad) => void;
  onStatus: (status: "AVAILABLE" | "MAINTENANCE") => void;
  onStartTrip: () => void;
  onEndTrip: () => void;
  onDone: () => void;
  notify: (outcome: FleetOutcome) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const over = overKg(truck);
  const percent = Math.round((truck.usedKg / truck.capacityKg) * 100);

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
        <TruckGraphic capacityKg={truck.capacityKg} loads={truck.loads} status={truck.status} size="lg" />
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-ink-700">
            <span className="font-mono font-semibold text-ink-950">{formatKg(truck.usedKg)}</span> of {formatKg(truck.capacityKg)}
          </p>
          <p className={cn("font-mono text-sm", over > 0 ? "font-semibold text-danger" : "text-ink-500")}>
            {over > 0 ? `${formatKg(over)} over` : `${percent}% · ${formatKg(truck.capacityKg - truck.usedKg)} free`}
          </p>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-frost-50 p-3">
        <p className="text-sm text-ink-700">
          {truck.status === "ON_TRIP" && truck.tripStartedAt ? (
            <>
              <span className="font-semibold text-ink-950">On a trip.</span> {tripSince(truck.tripStartedAt)}.
            </>
          ) : truck.status === "MAINTENANCE" ? (
            <span className="font-semibold text-ink-950">In maintenance.</span>
          ) : truck.loads.length > 0 ? (
            <>
              <span className="font-semibold text-ink-950">Loading.</span> Start the trip when it leaves.
            </>
          ) : (
            <span className="font-semibold text-ink-950">Empty and available.</span>
          )}
        </p>
        <TripButton truck={truck} onStart={onStartTrip} onEnd={onEndTrip} />
      </section>

      <section>
        <h3 className="caption text-ink-500">
          On board {truck.loads.length > 0 ? <span className="font-mono">({truck.loads.length})</span> : null}
        </h3>
        {truck.loads.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-frost-300 px-4 py-5 text-center text-sm text-ink-500">
            Empty. Choose this truck for a confirmed request on the fleet page.
          </p>
        ) : (
          <LoadRows loads={truck.loads} bandLabels={bandLabels} onMove={onMove} onRemove={onRemove} className="mt-1" />
        )}
      </section>

      <section>
        <h3 className="caption text-ink-500">Truck</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Fact label="Temperature">
            {truck.temperature ? (
              <span className={cn("inline-flex items-center gap-1.5", BAND_STYLES[truck.temperature].text)}>
                <span aria-hidden="true" className={cn("size-2 rounded-full", BAND_STYLES[truck.temperature].fill)} />
                {bandLabels[truck.temperature]}
              </span>
            ) : (
              <span className="text-ink-500">Not fixed</span>
            )}
          </Fact>
          <Fact label="Length">{truck.lengthFt !== null ? `${truck.lengthFt.toLocaleString("en-IN")} ft` : <span className="text-ink-500">—</span>}</Fact>
          <Fact label="Tyres">{truck.tyres ?? <span className="text-ink-500">—</span>}</Fact>
          <Fact label="Model">{truck.model ?? <span className="text-ink-500">—</span>}</Fact>
        </dl>
      </section>

      {truck.status !== "ON_TRIP" ? (
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
                    active ? "bg-surface text-ink-950 shadow-sm dark:bg-frost-300" : "text-ink-500 hover:text-ink-950",
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
      ) : null}

      {truck.driverName || truck.driverPhone ? (
        <section>
          <h3 className="caption text-ink-500">Driver</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="font-medium text-ink-950">
              {truck.driverName ?? "Driver"}
              {truck.driverPhone ? (
                <span className="ml-2 font-mono text-sm font-normal text-ink-500">{formatIndianMobile(truck.driverPhone)}</span>
              ) : null}
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
          <span aria-hidden="true" className="text-ink-400 transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="border-t border-frost-200 p-4">
          <TruckForm
            key={[truck.plateNumber, truck.capacityKg, truck.model, truck.driverName, truck.driverPhone, truck.temperature, truck.lengthFt, truck.tyres].join(":")}
            truck={truck}
            sizes={sizes}
            bandLabels={bandLabels}
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
