"use server";

import { refresh } from "next/cache";
import { formatInr } from "@/lib/format";
import { addQuoteNote, updateQuoteRequest } from "./admin";
import { isQuoteStatus } from "./status";

export type AdminFormState = {
  error?: string;
  success?: string;
};

/** Largest quote the panel accepts, to catch slips like an extra zero or a pasted phone number. */
const MAX_QUOTE_INR = 10_000_000;
const MAX_NOTE_LENGTH = 2000;

const GONE = "This request no longer exists.";

export async function saveQuoteUpdate(id: string, formData: FormData): Promise<AdminFormState> {
  const status = formData.get("status");
  if (!isQuoteStatus(status)) return { error: "Choose a status." };

  const rawAmount = String(formData.get("quotedAmount") ?? "").replace(/[₹,\s]/g, "");
  let quotedAmount: number | null = null;
  if (rawAmount !== "") {
    if (!/^\d{1,9}$/.test(rawAmount)) {
      return { error: "Enter the quote in whole rupees, for example 48500." };
    }
    quotedAmount = Number(rawAmount);
    if (quotedAmount < 1 || quotedAmount > MAX_QUOTE_INR) {
      return { error: `Enter a quote between ₹1 and ${formatInr(MAX_QUOTE_INR)}.` };
    }
  }

  const outcome = await updateQuoteRequest(id, { status, quotedAmount });
  if (outcome === "not-found") return { error: GONE };
  if (outcome === "unchanged") return { success: "Nothing to save." };

  refresh();
  return { success: "Saved." };
}

export async function saveQuoteNote(id: string, formData: FormData): Promise<AdminFormState> {
  // Browsers submit textarea line breaks as CRLF; store plain newlines.
  const body = String(formData.get("note") ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!body) return { error: "Write a note first." };
  if (body.length > MAX_NOTE_LENGTH) {
    return { error: `Keep notes under ${MAX_NOTE_LENGTH.toLocaleString("en-IN")} characters.` };
  }

  if (!(await addQuoteNote(id, body))) return { error: GONE };

  refresh();
  return { success: "Note added." };
}

/**
 * Moves a request to another stage from the pipeline board, optionally setting the price in
 * the same step (moving to Quoted). Leaving the price out keeps the one already saved.
 */
export async function moveQuoteStage(id: string, status: string, quotedAmount?: number): Promise<AdminFormState> {
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return { error: GONE };
  if (!isQuoteStatus(status)) return { error: "Choose a status." };
  if (
    quotedAmount !== undefined &&
    !(Number.isInteger(quotedAmount) && quotedAmount >= 1 && quotedAmount <= MAX_QUOTE_INR)
  ) {
    return { error: `Enter a quote between ₹1 and ${formatInr(MAX_QUOTE_INR)}.` };
  }

  const outcome = await updateQuoteRequest(id, { status, quotedAmount });
  if (outcome === "not-found") return { error: GONE };
  if (outcome === "updated") refresh();
  return { success: "Saved." };
}
