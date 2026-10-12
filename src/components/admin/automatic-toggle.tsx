"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * A checkbox that switches a piece of copy between the automatic text (generated from the
 * other settings, so its numbers stay correct) and text the business writes itself.
 */
export function AutomaticToggle({
  name,
  initiallyAutomatic,
  preview,
  children,
}: {
  name: string;
  initiallyAutomatic: boolean;
  /** The automatic text, shown while the checkbox is on. */
  preview: ReactNode;
  /** The editor, shown while the checkbox is off. */
  children: ReactNode;
}) {
  const id = useId();
  const [automatic, setAutomatic] = useState(initiallyAutomatic);

  return (
    <div className="space-y-4">
      <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-900">
        <input
          id={id}
          type="checkbox"
          name={name}
          checked={automatic}
          onChange={(event) => setAutomatic(event.target.checked)}
          className="size-4 rounded border-frost-300"
        />
        Use the automatic text
      </label>
      {automatic ? (
        <div className="rounded-lg border border-dashed border-frost-300 bg-frost-50 p-4 text-sm text-ink-700">
          {preview}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
