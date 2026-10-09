"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { saveQuoteNote, type AdminFormState } from "@/features/quotes/admin-actions";
import { FormMessage, PendingButton } from "./form-parts";
import { input, label } from "./ui";

export function NoteForm({ id }: { id: string }) {
  const fieldId = useId();
  const [note, setNote] = useState("");
  const [state, setState] = useState<AdminFormState>({});
  const [pending, startTransition] = useTransition();

  // Submitted by hand so the text is only cleared once the note has actually been saved.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await saveQuoteNote(id, formData);
        setState(result);
        if (result.success) setNote("");
      } catch {
        setState({ error: "Could not save the note. Check your connection and try again." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor={fieldId} className={label}>
        Add an internal note
      </label>
      <textarea
        id={fieldId}
        name="note"
        rows={3}
        required
        maxLength={2000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Only your team sees this"
        className={`${input} h-auto py-2.5 leading-6`}
      />
      <FormMessage state={state} />
      <PendingButton pending={pending} pendingLabel="Adding">
        Add note
      </PendingButton>
    </form>
  );
}
