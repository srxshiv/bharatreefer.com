import type { QuoteStatusId } from "@/features/quotes/status";

/** Accent colour of each pipeline stage, as a background class. */
export const STAGE_ACCENT: Record<QuoteStatusId, string> = {
  NEW: "bg-navy-900",
  CONTACTED: "bg-ice-300",
  QUOTED: "bg-ice-500",
  CONFIRMED: "bg-success",
  COMPLETED: "bg-ink-400",
  LOST: "bg-ink-300",
  SPAM: "bg-danger",
};
