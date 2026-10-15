"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
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
import { ROUTE_EVENT, type RoutePrefill } from "./route-prefill";
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
  const sectionRef = useRef<HTMLElement>(null);

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

  // A route card elsewhere on the page fills in the route, then the visitor carries on
  // from the first field still empty.
  useEffect(() => {
    function onRoute(event: Event) {
      const route = (event as CustomEvent<RoutePrefill>).detail;
      setResult((current) => (current.status === "success" ? INITIAL_QUOTE_FORM_STATE : current));
      setValues((current) => ({ ...current, ...route }));
      setErrors((current) => {
        const next = { ...current };
        for (const field of ["originState", "originCity", "destinationState", "destinationCity"] as const) delete next[field];
        return next;
      });
      // On wide screens the card is pinned and already in view; only scroll when it is not.
      const card = sectionRef.current;
      const box = card?.getBoundingClientRect();
      if (card && box && (box.top < 0 || box.bottom > window.innerHeight)) {
        card.scrollIntoView({ block: "start", behavior: "smooth" });
      }
      // After React has shown the form with the new values.
      setTimeout(() => {
        const form = formRef.current;
        if (!form) return;
        const after = QUOTE_FIELDS.slice(QUOTE_FIELDS.indexOf("destinationCity") + 1);
        for (const field of after) {
          const element = form.elements.namedItem(field);
          const target = element instanceof RadioNodeList ? (element.item(0) as HTMLElement | null) : element;
          if (target instanceof HTMLInputElement && target.type !== "radio" && target.value) continue;
          if (target instanceof HTMLElement) {
            target.focus({ preventScroll: true });
            break;
          }
        }
      }, 350);
    }
    window.addEventListener(ROUTE_EVENT, onRoute);
    return () => window.removeEventListener(ROUTE_EVENT, onRoute);
  }, []);

  function reset() {
    setValues(EMPTY_QUOTE_FORM);
    setErrors({});
    setResult(INITIAL_QUOTE_FORM_STATE);
  }

  return (
    <section
      ref={sectionRef}
      id="quote"
      aria-labelledby={`${id}-title`}
      className={cn(card, "flex scroll-mt-20 flex-col overflow-hidden lg:scroll-mt-24 shadow-[0_30px_60px_-30px_rgb(1_39_84/0.45)]", className)}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 bg-navy-900 px-5 py-3 text-white">
        <h2 id={`${id}-title`} className="flex items-center gap-2 text-base font-semibold">
          <Snowflake aria-hidden="true" className="size-4.5 text-ice-300" strokeWidth={1.75} />
          Request a quote
        </h2>
        <p className="text-sm text-ice-200">Reply within {business.responseTime}</p>
      </div>

      <div className="px-5 py-5 short:py-4">
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
                className="mt-4 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger"
              >
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {result.message}
              </p>
            ) : null}

            <button type="submit" disabled={pending} className={cn(primaryButton, "mt-5 h-11 w-full short:mt-4 short:h-10")}>
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
          </form>
        )}
      </div>
    </section>
  );
}
