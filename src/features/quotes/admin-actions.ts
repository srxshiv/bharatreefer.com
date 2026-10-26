"use server";

import { after } from "next/server";
import { refreshAdminData } from "@/features/auth/refresh-admin";
import { ROLE_LABELS } from "@/features/auth/roles";
import { getSiteContent } from "@/features/content/data";
import { formatInr } from "@/lib/format";
import { planTrucks } from "@/lib/truck-plan";
import { addQuoteNote, createQuoteRequestForCustomer, setQuoteReferrer, updateQuoteRequest } from "./admin";
import { quoteEmailData } from "./emails";
import { notifyNewQuoteRequest } from "./notify";
import { findReferrer } from "./data";
import {
  UNKNOWN_PROMO_CODE,
  createQuoteRequestSchema,
  readQuoteForm,
  toFieldErrors,
  type QuoteFieldErrors,
} from "./schema";
import { isQuoteStatus } from "./status";

export type AdminFormState = {
  error?: string;
  success?: string;
};

export type NewRequestState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: QuoteFieldErrors }
  | { status: "success"; id: string; reference: string; contactName: string };

/** Name of the tick box that sends the customer the same confirmation email as the website does. */
const CONFIRM_FIELD = "emailCustomer";

/**
 * Enters a request for a customer who called, messaged or walked in. Validated with the
 * website form's rules, then handled like any other request: it starts as New, and dispatch
 * is alerted with the name of whoever entered it.
 */
export async function createRequestForCustomer(formData: FormData): Promise<NewRequestState> {
  const { fleet } = await getSiteContent();
  const parsed = createQuoteRequestSchema(fleet).safeParse(readQuoteForm(formData));
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const input = parsed.data;
  const plan = planTrucks(input.quantityKg, fleet);
  if (!plan) return { status: "error", fieldErrors: { quantityKg: "Enter the weight in kilograms" } };

  const referrer = input.promoCode ? await findReferrer(input.promoCode) : null;
  if (input.promoCode && !referrer) {
    return { status: "error", message: "Check the highlighted fields.", fieldErrors: { promoCode: UNKNOWN_PROMO_CODE } };
  }

  // Checks the session before anything is stored.
  const { id, reference, createdBy } = await createQuoteRequestForCustomer(input, plan, referrer);

  const emailData = {
    ...quoteEmailData(reference, input, plan),
    createdBy: `${createdBy.name} (${ROLE_LABELS[createdBy.role].toLowerCase()})`,
    ...(referrer ? { promoCode: `${referrer.promoCode} (${referrer.name})` } : {}),
  };
  const confirmToCustomer = formData.get(CONFIRM_FIELD) === "on";
  after(() => notifyNewQuoteRequest(id, emailData, { confirmToCustomer }));

  refreshAdminData();
  return { status: "success", id, reference, contactName: input.contactName };
}

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

  refreshAdminData();
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

  refreshAdminData();
  return { success: "Note added." };
}

/** Credits a request to a team member, or to nobody. Admins only, checked in `setQuoteReferrer`. */
export async function saveQuoteReferrer(id: string, formData: FormData): Promise<AdminFormState> {
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return { error: GONE };
  const raw = formData.get("referrerId");
  const referrerId = typeof raw === "string" && raw !== "" ? raw : null;
  if (referrerId !== null && referrerId.length > 64) return { error: "Choose a team member." };

  const outcome = await setQuoteReferrer(id, referrerId);
  if (outcome === "not-found") return { error: GONE };
  if (outcome === "no-member") return { error: "That team member no longer exists." };
  if (outcome === "unchanged") return { success: "Nothing to save." };

  refreshAdminData();
  return { success: "Saved." };
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
  if (outcome === "updated") refreshAdminData();
  return { success: "Saved." };
}

/** Most requests one bulk change touches. */
const MAX_BULK = 200;

/** Moves several requests to one stage, as if each were moved on its own (timeline, trucks). */
export async function bulkMoveQuoteStage(ids: string[], status: string): Promise<AdminFormState> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BULK) return { error: "Choose the requests first." };
  if (!ids.every((id) => typeof id === "string" && id.length > 0 && id.length <= 64)) return { error: GONE };
  if (!isQuoteStatus(status)) return { error: "Choose a status." };

  let moved = 0;
  for (const id of ids) {
    if ((await updateQuoteRequest(id, { status })) === "updated") moved += 1;
  }
  if (moved > 0) refreshAdminData();
  return { success: moved === 0 ? "Nothing to change." : `${moved} ${moved === 1 ? "request" : "requests"} moved.` };
}
