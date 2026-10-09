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
};

/** The two inputs. Remounted whenever the saved values change, so they always start from them. */
function Fields({ status, quotedAmount }: Saved) {
  // Generated ids: Next.js keeps recently visited pages mounted, so two quotes can be in
  // the document at once and fixed ids would collide.
  const id = useId();
  const [selected, setSelected] = useState(status);

  return (
    <>
      <div>
        <label htmlFor={`${id}-status`} className={label}>
          Status
        </label>
        <select
          id={`${id}-status`}
          name="status"
          defaultValue={status}
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
            placeholder="Not quoted yet"
            maxLength={12}
            className={`${input} pl-8 font-mono`}
          />
        </div>
        <p className="mt-1.5 text-sm text-ink-500">Whole rupees. Leave empty to clear.</p>
      </div>
    </>
  );
}

export function QuoteUpdateForm({ id, status, quotedAmount }: Saved & { id: string }) {
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
      <Fields key={`${status}:${quotedAmount}`} status={status} quotedAmount={quotedAmount} />
      <FormMessage state={state} />
      <PendingButton pending={pending} pendingLabel="Saving" className="w-full">
        Save changes
      </PendingButton>
    </form>
  );
}
