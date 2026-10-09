"use client";

import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ChevronDown, CircleAlert, LoaderCircle } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import { MAX_QUANTITY_KG, MIN_QUANTITY_KG } from "@/config/fleet";
import { MATERIAL_LIST, type MaterialId } from "@/config/materials";
import { site } from "@/config/site";
import { REGION_NAMES, citiesIn } from "@/data/india-locations";
import { submitQuoteRequest } from "@/features/quotes/actions";
import {
  EMPTY_QUOTE_FORM,
  QUOTE_FIELDS,
  parseQuantityKg,
  quoteRequestSchema,
  toFieldErrors,
  type QuoteField,
  type QuoteFieldErrors,
  type QuoteFormValues,
} from "@/features/quotes/schema";
import { INITIAL_QUOTE_FORM_STATE, type QuoteFormState } from "@/features/quotes/state";
import { cn } from "@/lib/cn";
import { dateInIndia } from "@/lib/dates";
import { formatKg } from "@/lib/format";
import { planTrucks } from "@/lib/truck-plan";
import { QuoteConfirmationPanel } from "./quote-confirmation";
import { TruckPlanReadout } from "./truck-plan-readout";

const labelClass = "block text-sm font-medium text-ink-900";

const controlClass = cn(
  "h-12 w-full rounded-lg border border-frost-300 bg-white px-3.5 text-base text-ink-950",
  "transition-colors placeholder:text-ink-400 hover:border-ink-400",
  "focus:border-ink-900 focus:ring-2 focus:ring-ice-400/50 focus:outline-none",
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/25",
);

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-frost-200 px-5 py-5 sm:px-6">
      <legend className="caption float-left mb-4 w-full text-ink-500">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

export function QuoteForm() {
  const id = useId();
  const [values, setValues] = useState<QuoteFormValues>(EMPTY_QUOTE_FORM);
  const [errors, setErrors] = useState<QuoteFieldErrors>({});
  const [result, setResult] = useState<QuoteFormState>(INITIAL_QUOTE_FORM_STATE);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const quantity = parseQuantityKg(values.quantityKg);
  const plan = quantity === null ? null : planTrucks(quantity);

  function setField(field: QuoteField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  /** Changing the state drops a city that was picked from the previous state's list. */
  function setRegion(stateField: QuoteField, cityField: QuoteField, region: string) {
    const city = values[cityField];
    const stale = citiesIn(values[stateField]).includes(city) && !citiesIn(region).includes(city);
    setField(stateField, region);
    if (stale) setField(cityField, "");
  }

  /** Wires an input to its label, value and error message. */
  function control(field: QuoteField) {
    return {
      id: `${id}-${field}`,
      name: field,
      value: values[field],
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": errors[field] ? `${id}-${field}-error` : undefined,
    };
  }

  function showErrors(form: HTMLFormElement, fieldErrors: QuoteFieldErrors) {
    setErrors(fieldErrors);
    if (fieldErrors.pickupDate || fieldErrors.notes) setExtrasOpen(true);

    const firstInvalid = QUOTE_FIELDS.find((field) => fieldErrors[field]);
    if (!firstInvalid) return;
    // Wait a frame so a field inside the collapsed section is visible before it takes focus.
    requestAnimationFrame(() => {
      const element = form.elements.namedItem(firstInvalid);
      if (element instanceof HTMLElement) element.focus();
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const parsed = quoteRequestSchema.safeParse(values);
    if (!parsed.success) {
      setResult(INITIAL_QUOTE_FORM_STATE);
      showErrors(form, toFieldErrors(parsed.error));
      return;
    }

    const formData = new FormData(form);
    startTransition(async () => {
      let next: QuoteFormState;
      try {
        next = await submitQuoteRequest(formData);
      } catch {
        next = {
          status: "error",
          message: `We could not reach the server. Check your connection and try again, or call us on ${site.phone.display}.`,
        };
      }
      setResult(next);
      if (next.status === "error" && next.fieldErrors) showErrors(form, next.fieldErrors);
    });
  }

  function reset() {
    setValues(EMPTY_QUOTE_FORM);
    setErrors({});
    setExtrasOpen(false);
    setResult(INITIAL_QUOTE_FORM_STATE);
  }

  if (result.status === "success") {
    return <QuoteConfirmationPanel confirmation={result.confirmation} onReset={reset} />;
  }

  const route = [
    { legend: "Loading from", state: "originState", city: "originCity" },
    { legend: "Unloading at", state: "destinationState", city: "destinationCity" },
  ] as const;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby={`${id}-title`}
      className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-ink-950/40 ring-1 ring-white/10"
    >
      <div className="flex items-baseline justify-between gap-4 px-5 py-4 sm:px-6">
        <h2 id={`${id}-title`} className="text-lg font-bold tracking-tight text-ink-950">
          Request a quote
        </h2>
        <p className="caption text-ink-500">Reply in {site.responseTime}</p>
      </div>

      <Section title="Route">
        <div className="grid gap-4 sm:grid-cols-2">
          {route.map(({ legend, state, city }) => (
            <div key={state} role="group" aria-labelledby={`${id}-${state}-legend`}>
              <p id={`${id}-${state}-legend`} className={labelClass}>
                {legend}
              </p>
              <div className="mt-2 space-y-2">
                <div className="relative">
                  <select
                    {...control(state)}
                    aria-label={`${legend}: state`}
                    onChange={(event) => setRegion(state, city, event.target.value)}
                    className={cn(
                      controlClass,
                      "appearance-none pr-10",
                      !values[state] && "text-ink-500",
                    )}
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
                    className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-500"
                  />
                </div>
                <input
                  {...control(city)}
                  aria-label={`${legend}: city or town`}
                  type="text"
                  list={`${id}-${city}-options`}
                  autoComplete="off"
                  placeholder="City or town"
                  maxLength={80}
                  onChange={(event) => setField(city, event.target.value)}
                  className={controlClass}
                />
                <datalist id={`${id}-${city}-options`}>
                  {citiesIn(values[state]).map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <FieldError id={`${id}-${state}-error`} message={errors[state]} />
              <FieldError id={`${id}-${city}-error`} message={errors[city]} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Cargo">
        <div role="radiogroup" aria-labelledby={`${id}-material-legend`}>
          <p id={`${id}-material-legend`} className={labelClass}>
            Temperature
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {MATERIAL_LIST.map((band) => {
              const selected = values.material === band.id;
              return (
                <label
                  key={band.id}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-lg border px-3 py-2.5 transition-colors",
                    "has-focus-visible:ring-2 has-focus-visible:ring-ice-400/60",
                    selected
                      ? BAND_STYLES[band.id].selected
                      : "border-frost-300 bg-white hover:border-ink-400",
                  )}
                >
                  <input
                    type="radio"
                    name="material"
                    value={band.id}
                    checked={selected}
                    onChange={() => setField("material", band.id)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-950">
                    <span
                      aria-hidden="true"
                      className={cn("size-2 shrink-0 rounded-full", BAND_STYLES[band.id].fill)}
                    />
                    {band.label}
                  </span>
                  <span className="mt-1 font-mono text-xs leading-4 text-ink-500">{band.range}</span>
                </label>
              );
            })}
          </div>
          <FieldError id={`${id}-material-error`} message={errors.material} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[10.5rem_1fr]">
          <div>
            <label htmlFor={`${id}-quantityKg`} className={labelClass}>
              Weight
            </label>
            <div className="relative mt-2">
              <input
                {...control("quantityKg")}
                aria-describedby={cn(
                  errors.quantityKg && `${id}-quantityKg-error`,
                  `${id}-plan`,
                )}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 4,000"
                maxLength={9}
                onChange={(event) => setField("quantityKg", event.target.value)}
                className={cn(controlClass, "pr-11 font-mono")}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center font-mono text-sm text-ink-500">
                kg
              </span>
            </div>
          </div>
          <TruckPlanReadout
            id={`${id}-plan`}
            plan={plan}
            quantityKg={quantity}
            material={values.material as MaterialId}
          />
        </div>
        {errors.quantityKg ? (
          <FieldError id={`${id}-quantityKg-error`} message={errors.quantityKg} />
        ) : (
          <p className="mt-1.5 text-xs text-ink-500">
            {formatKg(MIN_QUANTITY_KG)} to {formatKg(MAX_QUANTITY_KG)} per request.
          </p>
        )}
      </Section>

      <Section title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-contactName`} className={labelClass}>
              Your name
            </label>
            <input
              {...control("contactName")}
              type="text"
              autoComplete="name"
              maxLength={80}
              onChange={(event) => setField("contactName", event.target.value)}
              className={cn(controlClass, "mt-2")}
            />
            <FieldError id={`${id}-contactName-error`} message={errors.contactName} />
          </div>
          <div>
            <label htmlFor={`${id}-phone`} className={labelClass}>
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
              className={cn(controlClass, "mt-2 font-mono")}
            />
            <FieldError id={`${id}-phone-error`} message={errors.phone} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-email`} className={labelClass}>
              Email <span className="font-normal text-ink-500">(optional)</span>
            </label>
            <input
              {...control("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              onChange={(event) => setField("email", event.target.value)}
              className={cn(controlClass, "mt-2")}
            />
            <FieldError id={`${id}-email-error`} message={errors.email} />
          </div>
        </div>

        <details
          open={extrasOpen}
          onToggle={(event) => setExtrasOpen(event.currentTarget.open)}
          className="group mt-4"
        >
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm font-medium text-ice-700 hover:text-ink-950 [&::-webkit-details-marker]:hidden">
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180"
            />
            Add a pickup date or notes
          </summary>
          <div className="mt-4 grid gap-4">
            <div>
              <label htmlFor={`${id}-pickupDate`} className={labelClass}>
                Pickup date <span className="font-normal text-ink-500">(optional)</span>
              </label>
              <input
                {...control("pickupDate")}
                type="date"
                // Set after mount so the server-rendered HTML does not depend on today's date.
                ref={(element) => {
                  if (element) element.min = dateInIndia();
                }}
                onChange={(event) => setField("pickupDate", event.target.value)}
                className={cn(controlClass, "mt-2 font-mono sm:max-w-56")}
              />
              <FieldError id={`${id}-pickupDate-error`} message={errors.pickupDate} />
            </div>
            <div>
              <label htmlFor={`${id}-notes`} className={labelClass}>
                Notes <span className="font-normal text-ink-500">(optional)</span>
              </label>
              <textarea
                {...control("notes")}
                rows={3}
                maxLength={1000}
                placeholder="What the cargo is, packaging, loading hours"
                onChange={(event) => setField("notes", event.target.value)}
                className={cn(controlClass, "mt-2 h-auto py-3 leading-6")}
              />
              <FieldError id={`${id}-notes-error`} message={errors.notes} />
            </div>
          </div>
        </details>
      </Section>

      {/* Bots fill this in; people never see it. */}
      <div aria-hidden="true" className="absolute -left-[200vw] size-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="border-t border-frost-200 bg-frost-50 px-5 py-5 sm:px-6">
        {result.status === "error" && result.message ? (
          <p
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {result.message}
          </p>
        ) : null}
        <button
          type="submit"
          aria-disabled={pending}
          className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-ink-950 px-5 text-base font-semibold text-white transition-colors hover:bg-ink-800 aria-disabled:cursor-progress aria-disabled:bg-ink-700"
        >
          {pending ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
              Sending request
            </>
          ) : (
            <>
              Request quote
              <ArrowRight aria-hidden="true" className="size-5" />
            </>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-ink-500">
          Your details are used only to answer this request.
        </p>
      </div>
    </form>
  );
}
