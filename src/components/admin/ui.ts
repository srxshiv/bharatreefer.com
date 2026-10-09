import { cn } from "@/lib/cn";

/** Shared Tailwind class sets for the admin panel. */
export const card = "rounded-xl border border-frost-200 bg-white";

export const label = "block text-sm font-medium text-ink-900";

export const input = cn(
  "h-11 w-full rounded-lg border border-frost-300 bg-white px-3 text-base text-ink-950",
  "transition-colors placeholder:text-ink-400 hover:border-ink-400",
  "focus:border-ink-900 focus:ring-2 focus:ring-ice-400/50 focus:outline-none",
);

const button =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-progress disabled:opacity-60";

export const primaryButton = cn(button, "bg-ink-950 text-white hover:bg-ink-800");

export const secondaryButton = cn(
  button,
  "border border-frost-300 bg-white text-ink-950 hover:border-ink-400",
);
