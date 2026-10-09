/** Quote pipeline stages, in the order dispatch works through them. Matches `QuoteStatus` in the schema. */
export const QUOTE_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "CONFIRMED",
  "COMPLETED",
  "LOST",
  "SPAM",
] as const;

export type QuoteStatusId = (typeof QUOTE_STATUSES)[number];

export const STATUS_LABELS: Record<QuoteStatusId, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  LOST: "Lost",
  SPAM: "Spam",
};

/** One line on what each stage means, shown next to the status picker. */
export const STATUS_HINTS: Record<QuoteStatusId, string> = {
  NEW: "Just received, nobody has responded yet.",
  CONTACTED: "Dispatch has spoken to the customer.",
  QUOTED: "A price has been given to the customer.",
  CONFIRMED: "The customer accepted and the load is booked.",
  COMPLETED: "The load was delivered.",
  LOST: "The customer did not go ahead.",
  SPAM: "Not a real request. Hidden from the main list.",
};

export function isQuoteStatus(value: unknown): value is QuoteStatusId {
  return typeof value === "string" && (QUOTE_STATUSES as readonly string[]).includes(value);
}
