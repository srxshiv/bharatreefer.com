"use client";

import { useId, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { CircleAlert, CircleCheck, Plus } from "lucide-react";
import { QuoteFields, type ControlProps } from "@/components/console/quote-fields";
import type { FleetConfig } from "@/config/fleet";
import type { MaterialId, TemperatureBandInfo } from "@/config/materials";
import { citiesIn } from "@/data/india-locations";
import { createRequestForCustomer, type NewRequestState } from "@/features/quotes/admin-actions";
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
import { cn } from "@/lib/cn";
import { planTrucks } from "@/lib/truck-plan";
import { PendingButton } from "../form-parts";
import { IntentLink } from "../intent-link";
import { card, primaryButton, secondaryButton } from "../ui";

const IDLE: NewRequestState = { status: "idle" };

/**
 * The website's quote form, for a team member entering a request on a customer's behalf.
 * Submits by hand, like the public form, so the fields keep what was typed when the server
 * finds a problem.
 */
export function NewRequestForm({
  fleet,
  bands,
  promoCode,
}: {
  fleet: FleetConfig;
  bands: Record<MaterialId, TemperatureBandInfo>;
  /** The team member's own code, filled in to start with: they brought the customer. */
  promoCode: string;
}) {
  const id = useId();
  const blank = { ...EMPTY_QUOTE_FORM, promoCode };
  const [values, setValues] = useState<QuoteFormValues>(blank);
  const [errors, setErrors] = useState<QuoteFieldErrors>({});
  const [emailCustomer, setEmailCustomer] = useState(true);
  const [result, setResult] = useState<NewRequestState>(IDLE);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const schema = useMemo(() => createQuoteRequestSchema(fleet), [fleet]);
  const quantityKg = parseQuantityKg(values.quantityKg);
  const plan = quantityKg === null ? null : planTrucks(quantityKg, fleet);

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
      setResult(IDLE);
      showErrors(toFieldErrors(parsed.error));
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      let next: NewRequestState;
      try {
        next = await createRequestForCustomer(formData);
      } catch {
        next = { status: "error", message: "Could not save. Check your connection and try again." };
      }
      setResult(next);
      if (next.status === "error" && next.fieldErrors) showErrors(next.fieldErrors);
    });
  }

  function reset() {
    setValues(blank);
    setErrors({});
    setEmailCustomer(true);
    setResult(IDLE);
  }

  if (result.status === "success") {
    return (
      <div className={cn(card, "p-6")}>
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-success">
          <CircleCheck aria-hidden="true" className="size-4" />
          Request created
        </p>
        <p className="mt-3 font-mono text-2xl font-semibold tracking-wide text-ink-950">{result.reference}</p>
        <p className="mt-1 text-sm text-ink-500">
          For {result.contactName}. Give them this reference if they are still on the line. The request is
          in the list as New, with your name on it.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <IntentLink href={`/desk/quotes/${result.id}`} className={primaryButton}>
            Open request
          </IntentLink>
          <button type="button" onClick={reset} className={secondaryButton}>
            <Plus aria-hidden="true" className="size-4" />
            Enter another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className={cn(card, "p-6")}>
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
        nameLabel="Customer name"
      />

      <label className="mt-5 flex items-start gap-3 rounded-lg border border-frost-200 bg-frost-50 px-3 py-2.5">
        {/* Read by the server action as "emailCustomer". */}
        <input
          type="checkbox"
          name="emailCustomer"
          checked={emailCustomer}
          onChange={(event) => setEmailCustomer(event.target.checked)}
          className="mt-0.5 size-4 rounded border-frost-300"
        />
        <span className="text-sm text-ink-900">
          Email the customer a confirmation with the reference
          <span className="block text-xs text-ink-500">
            The same email the website sends. Only if you entered their email address.
          </span>
        </span>
      </label>

      {result.status === "error" && result.message ? (
        <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {result.message}
        </p>
      ) : null}

      <div className="mt-6 border-t border-frost-200 pt-5">
        <PendingButton pending={pending} pendingLabel="Creating">
          Create request
        </PendingButton>
      </div>
    </form>
  );
}
