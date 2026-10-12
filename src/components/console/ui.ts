import { cn } from "@/lib/cn";

/** Shared class sets for the public site. */

export const fieldLabel = "block text-sm font-medium text-ink-900";

export const fieldHint = "mt-1.5 text-xs leading-5 text-ink-500";

export const fieldInput = cn(
  "h-11 w-full rounded-lg border border-frost-300 bg-white px-3.5 text-[15px] text-ink-950 short:h-10",
  "transition-[border-color,box-shadow] placeholder:text-ink-400 hover:border-frost-400",
  "focus:border-ice-500 focus:ring-4 focus:ring-ice-500/15 focus:outline-none",
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15",
);

export const fieldSelect = cn(fieldInput, "appearance-none pr-10");

const button =
  "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-medium transition-colors";

export const primaryButton = cn(
  button,
  "bg-navy-900 text-white hover:bg-navy-800 disabled:cursor-progress disabled:opacity-70",
);

export const secondaryButton = cn(
  button,
  "border border-frost-300 bg-white text-navy-900 hover:border-ice-500",
);

/** White card on the frost background. */
export const card = "rounded-2xl border border-frost-200 bg-white";
