"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, CircleAlert, Plus } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import type { FleetConfig } from "@/config/fleet";
import { MATERIAL_IDS, type MaterialId, type TemperatureBandInfo } from "@/config/materials";
import { REGION_NAMES, citiesIn } from "@/data/india-locations";
import type { QuoteField, QuoteFieldErrors, QuoteFormValues } from "@/features/quotes/schema";
import { cn } from "@/lib/cn";
import { dateInIndia } from "@/lib/dates";
import { LOAD_TYPE_LABELS, formatCapacity, formatKg, formatTrucks } from "@/lib/format";
import type { TruckPlan } from "@/lib/truck-plan";
import { FleetScale } from "./fleet-scale";
import { fieldInput, fieldLabel, fieldSelect } from "./ui";

/** Props every input needs to be labelled, controlled and described by its error. */
export type ControlProps = {
  id: string;
  name: QuoteField;
  value: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
};

export type QuoteFieldsProps = {
  id: string;
  values: QuoteFormValues;
  errors: QuoteFieldErrors;
  control: (field: QuoteField) => ControlProps;
  setField: (field: QuoteField, value: string) => void;
  setRegion: (stateField: QuoteField, cityField: QuoteField, region: string) => void;
  bands: Record<MaterialId, TemperatureBandInfo>;
  fleet: FleetConfig;
  plan: TruckPlan | null;
  quantityKg: number | null;
};

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

function Optional() {
  return <span className="font-normal text-ink-400"> (optional)</span>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="caption mb-3 text-ice-600 short:mb-2">{title}</legend>
      {children}
    </fieldset>
  );
}

function Place({
  legend,
  stateField,
  cityField,
  id,
  values,
  errors,
  control,
  setField,
  setRegion,
}: QuoteFieldsProps & { legend: string; stateField: QuoteField; cityField: QuoteField }) {
  return (
    <div role="group" aria-labelledby={`${id}-${stateField}-legend`}>
      <p id={`${id}-${stateField}-legend`} className={fieldLabel}>
        {legend}
      </p>
      <div className="mt-2 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
        <div className="relative">
          <select
            {...control(stateField)}
            aria-label={`${legend}: state`}
            onChange={(event) => setRegion(stateField, cityField, event.target.value)}
            className={cn(fieldSelect, !values[stateField] && "text-ink-400")}
          >
            <option value="">State</option>
            {REGION_NAMES.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400"
          />
        </div>
        <input
          {...control(cityField)}
          aria-label={`${legend}: city or town`}
          type="text"
          list={`${id}-${cityField}-options`}
          autoComplete="off"
          placeholder="City or town"
          maxLength={80}
          onChange={(event) => setField(cityField, event.target.value)}
          className={fieldInput}
        />
        <datalist id={`${id}-${cityField}-options`}>
          {citiesIn(values[stateField]).map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      <FieldError id={`${id}-${stateField}-error`} message={errors[stateField]} />
      <FieldError id={`${id}-${cityField}-error`} message={errors[cityField]} />
    </div>
  );
}

function describePlan(plan: TruckPlan): string {
  const percent = Math.round(plan.fill * 100);
  const truckCount = plan.trucks.reduce((sum, truck) => sum + truck.count, 0);
  if (plan.loadType === "PART_LOAD") {
    return `shares a ${formatCapacity(plan.totalCapacityKg)} truck with other cargo`;
  }
  return truckCount === 1
    ? `dedicated truck, ${percent}% of capacity used`
    : `${truckCount} dedicated trucks, ${percent}% of capacity used`;
}

/** Every field of the quote form, laid out for a card about 30rem wide. */
export function QuoteFields(props: QuoteFieldsProps) {
  const { id, values, errors, control, setField, bands, fleet, plan, quantityKg } = props;
  const [notesOpen, setNotesOpen] = useState(false);
  const showNotes = notesOpen || values.notes !== "" || Boolean(errors.notes);

  return (
    <div className="space-y-6 short:space-y-4">
      <Section title="Route">
        <div className="grid gap-4 short:gap-3">
          <Place {...props} legend="Loading from" stateField="originState" cityField="originCity" />
          <Place {...props} legend="Unloading at" stateField="destinationState" cityField="destinationCity" />
        </div>
      </Section>

      <Section title="Cargo">
        <div className="grid gap-4 short:gap-3">
          <div role="radiogroup" aria-labelledby={`${id}-material-legend`}>
            <p id={`${id}-material-legend`} className={fieldLabel}>
              Temperature
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {MATERIAL_IDS.map((bandId) => {
                const band = bands[bandId];
                const selected = values.material === bandId;
                return (
                  <label
                    key={bandId}
                    className={cn(
                      "flex h-11 cursor-pointer flex-col items-center justify-center rounded-lg border px-1.5 text-center transition-colors short:h-10",
                      "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ice-500",
                      selected
                        ? cn(BAND_STYLES[bandId].selected, "text-ink-950")
                        : "border-frost-300 bg-white text-ink-700 hover:border-frost-400",
                    )}
                  >
                    <input
                      type="radio"
                      name="material"
                      value={bandId}
                      checked={selected}
                      onChange={() => setField("material", bandId)}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", BAND_STYLES[bandId].fill)} />
                      {band.label}
                    </span>
                    <span className={cn("font-mono text-[0.625rem] leading-3", selected ? BAND_STYLES[bandId].text : "text-ink-400")}>
                      {band.range}
                    </span>
                  </label>
                );
              })}
            </div>
            <FieldError id={`${id}-material-error`} message={errors.material} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-quantityKg`} className={fieldLabel}>
                Weight
              </label>
              <div className="relative mt-2">
                <input
                  {...control("quantityKg")}
                  aria-describedby={cn(errors.quantityKg && `${id}-quantityKg-error`, `${id}-plan`)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 4,000"
                  maxLength={9}
                  onChange={(event) => setField("quantityKg", event.target.value)}
                  className={cn(fieldInput, "pr-10 font-mono")}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center font-mono text-sm text-ink-400">
                  kg
                </span>
              </div>
            </div>
            <div>
              <label htmlFor={`${id}-pickupDate`} className={fieldLabel}>
                Pickup
                <Optional />
              </label>
              <input
                {...control("pickupDate")}
                type="date"
                // Set after mount so the server-rendered HTML does not depend on today's date.
                ref={(element) => {
                  if (element) element.min = dateInIndia();
                }}
                onChange={(event) => setField("pickupDate", event.target.value)}
                className={cn(fieldInput, "mt-2 font-mono")}
              />
            </div>
          </div>
          <FieldError id={`${id}-pickupDate-error`} message={errors.pickupDate} />

          {errors.quantityKg ? (
            <FieldError id={`${id}-quantityKg-error`} message={errors.quantityKg} />
          ) : (
            <div id={`${id}-plan`} aria-live="polite" className="rounded-lg bg-frost-50 px-3 py-2.5">
              <p className="text-xs leading-5 text-ink-500">
                {plan ? (
                  <>
                    <span className="font-medium text-navy-900">
                      {formatTrucks(plan.trucks)}, {LOAD_TYPE_LABELS[plan.loadType].toLowerCase()}
                    </span>
                    , {describePlan(plan)}.
                  </>
                ) : quantityKg === null ? (
                  `Enter the weight to see which truck we would plan. ${formatKg(fleet.minQuantityKg)} to ${formatKg(fleet.maxQuantityKg)} per request.`
                ) : (
                  "That weight is outside what one request can cover."
                )}
              </p>
              <FleetScale capacitiesKg={fleet.capacitiesKg} plan={plan} className="mt-2" />
            </div>
          )}
        </div>
      </Section>

      <Section title="Contact">
        <div className="grid gap-4 sm:grid-cols-2 short:gap-3">
          <div>
            <label htmlFor={`${id}-contactName`} className={fieldLabel}>
              Your name
            </label>
            <input
              {...control("contactName")}
              type="text"
              autoComplete="name"
              maxLength={80}
              onChange={(event) => setField("contactName", event.target.value)}
              className={cn(fieldInput, "mt-2")}
            />
            <FieldError id={`${id}-contactName-error`} message={errors.contactName} />
          </div>
          <div>
            <label htmlFor={`${id}-phone`} className={fieldLabel}>
              Mobile number
            </label>
            <input
              {...control("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              maxLength={20}
              onChange={(event) => setField("phone", event.target.value)}
              className={cn(fieldInput, "mt-2 font-mono")}
            />
            <FieldError id={`${id}-phone-error`} message={errors.phone} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-email`} className={fieldLabel}>
              Email
              <Optional />
            </label>
            <input
              {...control("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              onChange={(event) => setField("email", event.target.value)}
              className={cn(fieldInput, "mt-2")}
            />
            <FieldError id={`${id}-email-error`} message={errors.email} />
          </div>
        </div>

        {showNotes ? (
          <div className="mt-4 short:mt-3">
            <label htmlFor={`${id}-notes`} className={fieldLabel}>
              Notes
              <Optional />
            </label>
            <textarea
              {...control("notes")}
              rows={2}
              maxLength={1000}
              placeholder="What the cargo is, packaging, loading hours"
              onChange={(event) => setField("notes", event.target.value)}
              className={cn(fieldInput, "mt-2 h-auto py-2.5 leading-6")}
            />
            <FieldError id={`${id}-notes-error`} message={errors.notes} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-ice-600 transition-colors hover:text-navy-900"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add a note about the cargo
          </button>
        )}
      </Section>
    </div>
  );
}
