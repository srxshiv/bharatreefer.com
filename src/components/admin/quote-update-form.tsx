"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { saveQuoteUpdate, type AdminFormState } from "@/features/quotes/admin-actions";
import {
  QUOTE_STATUSES,
  STATUS_HINTS,
  STATUS_LABELS,
  type QuoteStatusId,
} from "@/features/quotes/status";
import { FormMessage, PendingButton } from "./form-parts";
import { input, label } from "./ui";

type Saved = {
  status: QuoteStatusId;
  quotedAmount: number | null;
  /** "YYYY-MM-DD", or null when not set. */
  pickupDate: string | null;
};

/** The inputs. Remounted whenever the saved values change, so they always start from them. */
function Fields({ status, quotedAmount, pickupDate, startAt }: Saved & { startAt?: QuoteStatusId }) {
  // Generated ids: Next.js keeps recently visited pages mounted, so two quotes can be in
  // the document at once and fixed ids would collide.
  const id = useId();
  const [selected, setSelected] = useState(startAt ?? status);
  // Quoted means booked: it needs the price and the pickup date, so both are asked for.
  const booking = selected === "QUOTED";

  return (
    <>
      <div>
        <label htmlFor={`${id}-status`} className={label}>
          Status
        </label>
        <select
          id={`${id}-status`}
          name="status"
          defaultValue={startAt ?? status}
          onChange={(event) => setSelected(event.target.value as QuoteStatusId)}
          aria-describedby={`${id}-status-hint`}
          className={`${input} mt-2`}
        >
          {QUOTE_STATUSES.map((option) => (
            <option key={option} value={option}>
              {STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <p id={`${id}-status-hint`} className="mt-1.5 text-sm text-ink-500">
          {STATUS_HINTS[selected]}
        </p>
      </div>

      <div>
        <label htmlFor={`${id}-amount`} className={label}>
          Quoted amount
        </label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-ink-500">
            ₹
          </span>
          <input
            id={`${id}-amount`}
            name="quotedAmount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={quotedAmount ?? ""}
            // Opened to quote it: the price is what is needed first.
            autoFocus={startAt === "QUOTED" && quotedAmount === null}
            placeholder="Not quoted yet"
            maxLength={12}
            className={`${input} pl-8 font-mono`}
          />
        </div>
        <p className="mt-1.5 text-sm text-ink-500">
          {booking ? "Whole rupees. Needed for Quoted." : "Whole rupees. Leave empty to clear."}
        </p>
      </div>

      <div>
        <label htmlFor={`${id}-pickup`} className={label}>
          Pickup date
        </label>
        <input
          id={`${id}-pickup`}
          name="pickupDate"
          type="date"
          defaultValue={pickupDate ?? ""}
          className={`${input} mt-2 font-mono`}
        />
        <p className="mt-1.5 text-sm text-ink-500">
          {booking
            ? "Needed for Quoted. The customer is told the truck the day before."
            : "The day the customer wants it loaded, if known."}
        </p>
      </div>
    </>
  );
}

/**
 * Status, quoted amount and pickup date. `startAt` opens it at another stage, unsaved: the
 * list sends a request here at Quoted when it still needs its quote and pickup date.
 */
export function QuoteUpdateForm({ id, status, quotedAmount, pickupDate, startAt }: Saved & { id: string; startAt?: QuoteStatusId }) {
  const [state, setState] = useState<AdminFormState>({});
  const [pending, startTransition] = useTransition();

  // Submitted by hand instead of through the form's `action`: React resets a form after
  // its action runs, which would put the status picker back on the old value.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        setState(await saveQuoteUpdate(id, formData));
      } catch {
        setState({ error: "Could not save. Check your connection and try again." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Fields
        key={`${status}:${quotedAmount}:${pickupDate}:${startAt}`}
        status={status}
        quotedAmount={quotedAmount}
        pickupDate={pickupDate}
        startAt={startAt}
      />
      <FormMessage state={state} />
      <PendingButton pending={pending} pendingLabel="Saving" className="w-full">
        Save changes
      </PendingButton>
    </form>
  );
}
