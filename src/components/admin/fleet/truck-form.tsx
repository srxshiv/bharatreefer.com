"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { MATERIAL_IDS, type MaterialId } from "@/config/materials";
import type { FleetOutcome, FleetTruck } from "@/features/fleet/types";
import type { TruckSizeInfo } from "@/features/content/types";
import { formatPlate } from "@/features/fleet/plate";
import { formatCapacity } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import { cn } from "@/lib/cn";
import { FormMessage, PendingButton } from "../form-parts";
import { input, label } from "../ui";

/** Add or edit a truck. Submits by hand so the fields keep what was typed when it fails. */
export function TruckForm({
  truck,
  sizes,
  bandLabels,
  defaultCapacityKg,
  submitLabel,
  onSubmit,
  onSaved,
}: {
  truck?: FleetTruck;
  sizes: TruckSizeInfo[];
  bandLabels: Record<MaterialId, string>;
  defaultCapacityKg?: number;
  submitLabel: string;
  onSubmit: (formData: FormData) => Promise<FleetOutcome>;
  onSaved: (message: string) => void;
}) {
  const id = useId();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const capacities = sizes.map((size) => size.capacityKg);
  const current = truck?.capacityKg ?? defaultCapacityKg;
  if (current !== undefined && !capacities.includes(current)) capacities.push(current);
  capacities.sort((a, b) => a - b);
  const names = new Map(sizes.map((size) => [size.capacityKg, size.name]));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const outcome = await onSubmit(formData);
        if (outcome.ok) {
          setError(undefined);
          onSaved(outcome.message);
        } else {
          setError(outcome.error);
        }
      } catch {
        setError("Could not save. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-plate`} className={label}>
            Number plate
          </label>
          <input
            id={`${id}-plate`}
            name="plateNumber"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={16}
            defaultValue={truck ? formatPlate(truck.plateNumber) : ""}
            placeholder="DL 01 LA 4521"
            className={cn(input, "mt-1.5 font-mono uppercase")}
          />
        </div>
        <div>
          <label htmlFor={`${id}-capacity`} className={label}>
            Payload
          </label>
          <select
            id={`${id}-capacity`}
            name="capacityKg"
            required
            defaultValue={current ?? ""}
            className={cn(input, "mt-1.5")}
          >
            <option value="" disabled>
              Choose a size
            </option>
            {capacities.map((kg) => (
              <option key={kg} value={kg}>
                {formatCapacity(kg)}
                {names.get(kg) ? ` · ${names.get(kg)}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-temperature`} className={label}>
            Temperature
          </label>
          <select
            id={`${id}-temperature`}
            name="temperature"
            defaultValue={truck?.temperature ?? ""}
            className={cn(input, "mt-1.5")}
          >
            <option value="">Not fixed</option>
            {MATERIAL_IDS.map((band) => (
              <option key={band} value={band}>
                {bandLabels[band]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-length`} className={label}>
            Length <span className="font-normal text-ink-500">(ft)</span>
          </label>
          <input
            id={`${id}-length`}
            name="lengthFt"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={truck?.lengthFt ?? ""}
            placeholder="e.g. 20"
            className={cn(input, "mt-1.5 font-mono")}
          />
        </div>
        <div>
          <label htmlFor={`${id}-tyres`} className={label}>
            Tyres
          </label>
          <input
            id={`${id}-tyres`}
            name="tyres"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={truck?.tyres ?? ""}
            placeholder="e.g. 6"
            className={cn(input, "mt-1.5 font-mono")}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-model`} className={label}>
          Model or body <span className="font-normal text-ink-500">(optional)</span>
        </label>
        <input
          id={`${id}-model`}
          name="model"
          maxLength={60}
          defaultValue={truck?.model ?? ""}
          placeholder="e.g. Tata 407 reefer, 14 ft"
          className={cn(input, "mt-1.5")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-driver`} className={label}>
            Driver <span className="font-normal text-ink-500">(optional)</span>
          </label>
          <input
            id={`${id}-driver`}
            name="driverName"
            maxLength={60}
            autoComplete="off"
            defaultValue={truck?.driverName ?? ""}
            className={cn(input, "mt-1.5")}
          />
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className={label}>
            Driver&rsquo;s mobile <span className="font-normal text-ink-500">(optional)</span>
          </label>
          <input
            id={`${id}-phone`}
            name="driverPhone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            defaultValue={truck?.driverPhone ? formatIndianMobile(truck.driverPhone) : ""}
            className={cn(input, "mt-1.5 font-mono")}
          />
        </div>
      </div>
      <FormMessage state={{ error }} />
      <PendingButton pending={pending} pendingLabel="Saving" className="w-full sm:w-auto">
        {submitLabel}
      </PendingButton>
    </form>
  );
}
