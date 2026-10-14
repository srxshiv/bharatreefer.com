"use client";

import { cn } from "@/lib/cn";

/** An on/off switch. Pass `name` to submit "on" with a form when it is on. */
export function Switch({
  checked,
  onChange,
  label,
  name,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Read by screen readers; the visible label sits next to the switch. */
  label: string;
  name?: string;
  className?: string;
}) {
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200",
          checked ? "bg-success" : "bg-frost-300",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-5.5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[1.375rem]" : "translate-x-[0.1875rem]",
          )}
        />
      </button>
      {name && checked ? <input type="hidden" name={name} value="on" /> : null}
    </>
  );
}
