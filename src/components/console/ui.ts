import { cn } from "@/lib/cn";

/** Shared class sets for the public site. */

export const fieldLabel = "block text-sm font-medium text-ink-900";

export const fieldHint = "mt-1.5 text-xs leading-5 text-ink-500";

/** 16px text on phones: iOS zooms the page into any field with smaller text. */
const fieldBox = cn(
  "w-full rounded-lg border border-frost-300 bg-surface px-3 text-base text-ink-950 sm:text-[15px] short:text-sm",
  "transition-[border-color,box-shadow] placeholder:text-ink-400 hover:border-frost-400",
  "focus:border-ice-500 focus:ring-4 focus:ring-ice-500/15 focus:outline-none",
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15",
);

export const fieldInput = cn(fieldBox, "h-11 lg:h-10 short:h-9");

/** A text box that grows with its rows: no fixed height. */
export const fieldArea = cn(fieldBox, "py-2.5 leading-6");

export const fieldSelect = cn(fieldInput, "appearance-none pr-10");

const button =
  "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-medium transition-colors";

export const primaryButton = cn(
  button,
  "bg-navy-900 text-white hover:bg-navy-800 disabled:cursor-progress disabled:opacity-70",
);

export const secondaryButton = cn(
  button,
  "border border-frost-300 bg-surface text-ink-950 hover:border-ice-500",
);

/** White card on the frost background. */
export const card = "rounded-2xl border border-frost-200 bg-surface";
