"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { FormMessage, PendingButton } from "./form-parts";

type FormState = { error?: string; success?: string };

/**
 * A settings form. Submits by hand rather than through `action`, so the fields keep what
 * was typed when validation fails instead of being reset to their saved values.
 */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Saving",
  encType,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel?: string;
  encType?: "multipart/form-data";
  children: ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        const result = await action(formData);
        setState(result);
        if (result.success && encType === "multipart/form-data") form.reset();
      } catch {
        setState({ error: "Could not save. Check your connection and try again." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} encType={encType} className={className}>
      {children}
      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-frost-200 pt-5">
        <PendingButton pending={pending} pendingLabel={pendingLabel}>
          {submitLabel}
        </PendingButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
