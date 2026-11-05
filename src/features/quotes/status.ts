/** Quote pipeline stages, in the order dispatch works through them. Matches `QuoteStatus` in the schema. */
export const QUOTE_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "COMPLETED",
  "LOST",
  "SPAM",
] as const;

export type QuoteStatusId = (typeof QUOTE_STATUSES)[number];

export const STATUS_LABELS: Record<QuoteStatusId, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  COMPLETED: "Completed",
  LOST: "Lost",
  SPAM: "Spam",
};

/** One line on what each stage means, shown next to the status picker. */
export const STATUS_HINTS: Record<QuoteStatusId, string> = {
  NEW: "Just received, nobody has responded yet.",
  CONTACTED: "Dispatch has spoken to the customer.",
  QUOTED: "Price and pickup agreed: the load is booked and goes on a truck. Needs the quote and the pickup date.",
  COMPLETED: "The load was delivered.",
  LOST: "The customer did not go ahead.",
  SPAM: "Not a real request. Hidden from the main list.",
};

export function isQuoteStatus(value: unknown): value is QuoteStatusId {
  return typeof value === "string" && (QUOTE_STATUSES as readonly string[]).includes(value);
}
