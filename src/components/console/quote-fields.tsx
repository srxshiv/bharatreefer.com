"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleAlert, Plus, Tag } from "lucide-react";
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
  /** Label of the name field. The panel asks for the customer's name instead of "your" name. */
  nameLabel?: string;
};

/**
 * The message a screen reader gets for an invalid field. Sighted users see the red border
 * and the summary in the plan box, which keeps the card the same height whatever happens.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="sr-only">
      {message}
    </p>
  );
}

/** Field names for the error summary. */
const FIELD_NAMES: Record<QuoteField, string> = {
  originState: "Loading state",
  originCity: "Loading city",
  destinationState: "Unloading state",
  destinationCity: "Unloading city",
  pickupDate: "Pickup date",
  material: "Temperature",
  quantityKg: "Weight",
  notes: "Notes",
  contactName: "Name",
  phone: "Mobile number",
  email: "Email",
  promoCode: "Promo code",
};

/** "Enter a 10-digit Indian mobile number" -> "enter a 10-digit Indian mobile number" */
function sentenceCase(message: string): string {
  return message.charAt(0).toLowerCase() + message.slice(1);
}

function ErrorSummary({ errors }: { errors: QuoteFieldErrors }) {
  const entries = (Object.keys(errors) as QuoteField[]).filter((field) => errors[field]);
  const required = entries.filter((field) => /^(Select|Enter (the|your)|Choose)/.test(errors[field] ?? ""));
  const specific = entries.filter((field) => !required.includes(field));

  // Missing fields are obvious from their red borders; spell out only the ones typed wrongly.
  const lines = [
    ...(required.length > 0
      ? [required.length === 1 ? `${FIELD_NAMES[required[0]]}: ${sentenceCase(errors[required[0]] ?? "")}.` : `Fill in the ${required.length} highlighted fields.`]
      : []),
    ...specific.map((field) => `${FIELD_NAMES[field]}: ${sentenceCase(errors[field] ?? "")}.`),
  ].slice(0, 2);

  return (
    <div role="alert" className="flex items-start gap-1.5 text-xs leading-5 text-danger">
      <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" />
      <p>{lines.join(" ")}</p>
    </div>
  );
}

function Optional() {
  return <span className="font-normal text-ink-400"> (optional)</span>;
}

/** A state picker over a city box, labelled as one place. */
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
      <div className="relative mt-1.5">
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
        className={cn(fieldInput, "mt-2")}
      />
      <datalist id={`${id}-${cityField}-options`}>
        {citiesIn(values[stateField]).map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <FieldError id={`${id}-${stateField}-error`} message={errors[stateField]} />
      <FieldError id={`${id}-${cityField}-error`} message={errors[cityField]} />
    </div>
  );
}

function describePlan(plan: TruckPlan): string {
  const percent = Math.round(plan.fill * 100);
  const truckCount = plan.trucks.reduce((sum, truck) => sum + truck.count, 0);
  if (plan.loadType === "PART_LOAD") return `shares a ${formatCapacity(plan.totalCapacityKg)} truck`;
  return truckCount === 1 ? `${percent}% of the truck used` : `${truckCount} trucks, ${percent}% used`;
}

/** Every field of the quote form, laid out to fit the card on a laptop screen without scrolling. */
export function QuoteFields(props: QuoteFieldsProps) {
  const { id, values, errors, control, setField, bands, fleet, plan, quantityKg, nameLabel = "Your name" } = props;
  const [notesOpen, setNotesOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const showNotes = notesOpen || values.notes !== "" || Boolean(errors.notes);
  // Open whenever there is a code, such as one filled in from a shared link.
  const showPromo = promoOpen || values.promoCode !== "" || Boolean(errors.promoCode);
  const promoRef = useRef<HTMLInputElement>(null);

  // Opened by a click: move to the field straight after it renders. Not when a shared link
  // opened it, which would pull the page to the form as it loads.
  useEffect(() => {
    if (promoOpen) promoRef.current?.focus();
  }, [promoOpen]);
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="space-y-5 short:space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-3">
        <Place {...props} legend="Loading from" stateField="originState" cityField="originCity" />
        <Place {...props} legend="Unloading at" stateField="destinationState" cityField="destinationCity" />
      </div>

      <div className="space-y-3">
        <div role="radiogroup" aria-labelledby={`${id}-material-legend`}>
          <p id={`${id}-material-legend`} className={fieldLabel}>
            Temperature
          </p>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {MATERIAL_IDS.map((bandId) => {
              const band = bands[bandId];
              const selected = values.material === bandId;
              return (
                <label
                  key={bandId}
                  className={cn(
                    "flex h-11 cursor-pointer flex-col items-center justify-center rounded-lg border px-1.5 text-center transition-colors lg:h-10 short:h-9",
                    "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ice-500",
                    selected
                      ? cn(BAND_STYLES[bandId].selected, "text-ink-950")
                      : "border-frost-300 bg-surface text-ink-700 hover:border-frost-400",
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
                  <span className={cn("font-mono text-[0.625rem] leading-3 short:hidden", selected ? BAND_STYLES[bandId].text : "text-ink-400")}>
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
            <div className="relative mt-1.5">
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
            <FieldError id={`${id}-quantityKg-error`} message={errors.quantityKg} />
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
              className={cn(fieldInput, "mt-1.5 font-mono")}
            />
            <FieldError id={`${id}-pickupDate-error`} message={errors.pickupDate} />
          </div>
        </div>

        <div
          id={`${id}-plan`}
          aria-live="polite"
          className={cn("rounded-lg px-3 py-2", hasErrors ? "bg-danger-soft" : "bg-frost-50")}
        >
          {hasErrors ? (
            <div className="flex h-11 flex-col justify-center">
              <ErrorSummary errors={errors} />
            </div>
          ) : (
            <>
          <p className="text-xs leading-5 text-ink-500 lg:truncate">
            {plan ? (
              <>
                <span className="font-medium text-ink-950">
                  {formatTrucks(plan.trucks)}, {LOAD_TYPE_LABELS[plan.loadType].toLowerCase()}
                </span>
                , {describePlan(plan)}.
              </>
            ) : quantityKg === null ? (
              `Enter the weight to see the truck we would plan. ${formatKg(fleet.minQuantityKg)} to ${formatKg(fleet.maxQuantityKg)}.`
            ) : (
              "That weight is outside what one request can cover."
            )}
          </p>
          <FleetScale capacitiesKg={fleet.capacitiesKg} plan={plan} className="mt-1.5" />
            </>
          )}
        </div>
      </div>

      <div>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-x-3">
          <div>
            <label htmlFor={`${id}-contactName`} className={fieldLabel}>
              {nameLabel}
            </label>
            <input
              {...control("contactName")}
              type="text"
              autoComplete="name"
              maxLength={80}
              onChange={(event) => setField("contactName", event.target.value)}
              className={cn(fieldInput, "mt-1.5")}
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
              className={cn(fieldInput, "mt-1.5 font-mono")}
            />
            <FieldError id={`${id}-phone-error`} message={errors.phone} />
          </div>
          <div>
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
              className={cn(fieldInput, "mt-1.5")}
            />
            <FieldError id={`${id}-email-error`} message={errors.email} />
          </div>
        </div>

        {/* Notes and the promo code share a row: both stay out of the way until asked for. */}
        <div className="mt-2.5 flex items-end gap-3 short:mt-2">
          <div className="min-w-0 flex-1">
            {showNotes ? (
              <>
                <label htmlFor={`${id}-notes`} className={cn(fieldLabel, "short:sr-only")}>
                  Notes
                  <Optional />
                </label>
                <textarea
                  {...control("notes")}
                  rows={2}
                  maxLength={1000}
                  placeholder="Notes: what the cargo is, packaging, loading hours"
                  onChange={(event) => setField("notes", event.target.value)}
                  className={cn(fieldInput, "mt-1.5 h-auto py-2 leading-5 short:mt-0 short:h-9 short:resize-none short:py-2 short:leading-5")}
                />
                <FieldError id={`${id}-notes-error`} message={errors.notes} />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-ice-600 transition-colors hover:text-ink-950"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Add a note about the cargo
              </button>
            )}
          </div>

          {showPromo ? (
            <div className="w-28 shrink-0">
              <label htmlFor={`${id}-promoCode`} className="sr-only">
                Promo code (optional)
              </label>
              <input
                {...control("promoCode")}
                ref={promoRef}
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Promo code"
                maxLength={8}
                onChange={(event) => setField("promoCode", event.target.value)}
                className={cn(fieldInput, "font-mono uppercase placeholder:font-sans placeholder:normal-case")}
              />
              <FieldError id={`${id}-promoCode-error`} message={errors.promoCode} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPromoOpen(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-ice-600 transition-colors hover:text-ink-950"
            >
              <Tag aria-hidden="true" className="size-3.5" />
              Promo code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
