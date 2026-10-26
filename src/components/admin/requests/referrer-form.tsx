"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { saveQuoteReferrer, type AdminFormState } from "@/features/quotes/admin-actions";
import type { ReferrerOption } from "@/features/quotes/admin";
import { cn } from "@/lib/cn";
import { FormMessage } from "../form-parts";
import { input } from "../ui";

/**
 * Admins credit a request to whoever brought the customer: for a customer who forgot the
 * code, or gave the wrong one. The request then shows up for that team member.
 */
export function ReferrerForm({
  quoteId,
  referrerCode,
  options,
}: {
  quoteId: string;
  /** The promo code the request is credited to now, if any. */
  referrerCode: string | null;
  options: ReferrerOption[];
}) {
  const fieldId = useId();
  const [state, setState] = useState<AdminFormState>({});
  const [pending, startTransition] = useTransition();
  const current = options.find((option) => option.promoCode === referrerCode)?.id ?? "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        setState(await saveQuoteReferrer(quoteId, formData));
      } catch {
        setState({ error: "Could not save. Check your connection and try again." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor={fieldId} className="sr-only">
        Credit to
      </label>
      <div className="flex gap-2">
        <select id={fieldId} name="referrerId" defaultValue={current} className={cn(input, "h-10 min-w-0 flex-1")}>
          <option value="">Nobody (no promo code)</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.promoCode}){option.disabled ? ", switched off" : ""}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 shrink-0 items-center rounded-lg border border-frost-300 bg-surface px-3 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-400 disabled:opacity-60"
        >
          {pending ? "Saving" : "Save"}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
