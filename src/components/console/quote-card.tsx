"use client";

import { useId, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { ArrowRight, CircleAlert, LoaderCircle, Snowflake } from "lucide-react";
import type { FleetConfig } from "@/config/fleet";
import type { MaterialId, TemperatureBandInfo } from "@/config/materials";
import type { BusinessInfo } from "@/config/site";
import { submitQuoteRequest } from "@/features/quotes/actions";
import {
  EMPTY_QUOTE_FORM,
  QUOTE_FIELDS,
  createQuoteRequestSchema,
  parseQuantityKg,
  toFieldErrors,
  type QuoteField,
  type QuoteFieldErrors,
  type QuoteFormValues,
} from "@/features/quotes/schema";
import { INITIAL_QUOTE_FORM_STATE, type QuoteFormState } from "@/features/quotes/state";
import { citiesIn } from "@/data/india-locations";
import { cn } from "@/lib/cn";
import { formatIndianMobile } from "@/lib/phone";
import { planTrucks } from "@/lib/truck-plan";
import { Confirmation } from "./confirmation";
import { QuoteFields, type ControlProps } from "./quote-fields";
import { card, primaryButton } from "./ui";

/** The one thing a visitor does here: the quote form, in a single card. */
export function QuoteCard({
  business,
  fleet,
  bands,
  className,
}: {
  business: BusinessInfo;
  fleet: FleetConfig;
  bands: Record<MaterialId, TemperatureBandInfo>;
  className?: string;
}) {
  const id = useId();
  const [values, setValues] = useState<QuoteFormValues>(EMPTY_QUOTE_FORM);
  const [errors, setErrors] = useState<QuoteFieldErrors>({});
  const [result, setResult] = useState<QuoteFormState>(INITIAL_QUOTE_FORM_STATE);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const schema = useMemo(() => createQuoteRequestSchema(fleet), [fleet]);
  const quantityKg = parseQuantityKg(values.quantityKg);
  const plan = quantityKg === null ? null : planTrucks(quantityKg, fleet);
  const confirmation = result.status === "success" ? result.confirmation : null;

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

  function control(field: QuoteField): ControlProps {
    return {
      id: `${id}-${field}`,
      name: field,
      value: values[field],
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": errors[field] ? `${id}-${field}-error` : undefined,
    };
  }

  /** Shows the errors and moves focus to the first field that has one. */
  function showErrors(fieldErrors: QuoteFieldErrors) {
    setErrors(fieldErrors);
    const first = QUOTE_FIELDS.find((field) => fieldErrors[field]);
    if (!first) return;
    requestAnimationFrame(() => {
      const element = formRef.current?.elements.namedItem(first);
      if (element instanceof HTMLElement) {
        element.focus();
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setResult(INITIAL_QUOTE_FORM_STATE);
      showErrors(toFieldErrors(parsed.error));
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      let next: QuoteFormState;
      try {
        next = await submitQuoteRequest(formData);
      } catch {
        next = {
          status: "error",
          message: `We could not reach the server. Check your connection and try again, or call us on ${formatIndianMobile(business.phone)}.`,
        };
      }
      setResult(next);
      if (next.status === "error" && next.fieldErrors) showErrors(next.fieldErrors);
    });
  }

  function reset() {
    setValues(EMPTY_QUOTE_FORM);
    setErrors({});
    setResult(INITIAL_QUOTE_FORM_STATE);
  }

  return (
    <section
      id="quote"
      aria-labelledby={`${id}-title`}
      className={cn(card, "flex scroll-mt-20 flex-col overflow-hidden lg:scroll-mt-24 shadow-[0_30px_60px_-30px_rgb(10_45_87/0.45)]", className)}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 bg-navy-900 px-6 py-4 text-white short:py-3">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            Request a quote
          </h2>
          <p className="mt-0.5 text-sm text-ice-200">
            Reply within {business.responseTime}. No account needed.
          </p>
        </div>
        <Snowflake aria-hidden="true" className="size-7 shrink-0 text-ice-300" strokeWidth={1.5} />
      </div>

      {/* Taller than a laptop screen, so the body scrolls inside the card while the card stays put. */}
      <div className="min-h-0 overflow-y-auto overscroll-contain px-6 py-6 [scrollbar-color:var(--color-frost-300)_transparent] [scrollbar-width:thin] short:py-5">
        {confirmation ? (
          <Confirmation confirmation={confirmation} business={business} bands={bands} onReset={reset} />
        ) : (
          <form id="quote-form" ref={formRef} noValidate onSubmit={handleSubmit}>
            <QuoteFields
              id={id}
              values={values}
              errors={errors}
              control={control}
              setField={setField}
              setRegion={setRegion}
              bands={bands}
              fleet={fleet}
              plan={plan}
              quantityKg={quantityKg}
            />

            {/* Bots fill this in; people never see it. */}
            <div aria-hidden="true" className="absolute left-[-200vw] size-px overflow-hidden">
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            {result.status === "error" && result.message ? (
              <p
                role="alert"
                className="mt-5 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {result.message}
              </p>
            ) : null}

            <button type="submit" disabled={pending} className={cn(primaryButton, "mt-6 w-full short:mt-5")}>
              {pending ? (
                <>
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  Request quote
                  <ArrowRight aria-hidden="true" className="size-4" />
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-ink-500">
              Dispatch uses these details only to answer this request.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
