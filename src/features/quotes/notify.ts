import "server-only";
import { siteUrl } from "@/config/site";
import { PANEL_HOME } from "@/features/auth/cookie";
import { getSiteContent } from "@/features/content/data";
import { toIsoDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail, type EmailOutcome } from "@/lib/email";
import { parseTruckPlan } from "@/lib/truck-plan";
import { recordNotification } from "./data";
import {
  customerConfirmationEmail,
  customerQuoteEmail,
  dispatchNotificationEmail,
  type QuoteEmailData,
} from "./emails";

/** Writes the result of one email to the request's timeline. Skipped sends leave no trace. */
async function log(quoteId: string, what: string, to: string, outcome: EmailOutcome) {
  if (outcome.status === "skipped") return;
  if (outcome.status === "failed") {
    console.error(`[email] ${what} to ${to} failed: ${outcome.reason}`);
  }
  await recordNotification(
    quoteId,
    outcome.status === "sent" ? `${what} emailed to ${to}` : `${what} could not be emailed to ${to}`,
  );
}

/**
 * Emails dispatch about a new request and confirms to the customer if they left an
 * address (unless `confirmToCustomer` is false: a team member entering a request can leave
 * the confirmation out). Runs after the confirmation screen is already showing, and never
 * throws, so a mail problem cannot affect the request itself.
 */
export async function notifyNewQuoteRequest(
  quoteId: string,
  quote: QuoteEmailData,
  { confirmToCustomer = true }: { confirmToCustomer?: boolean } = {},
) {
  try {
    const { business, bands } = await getSiteContent();
    const context = { business, bands };
    const dispatchAddress = business.alertEmail ?? business.email;
    const panelUrl = `${siteUrl}${PANEL_HOME}/quotes/${quoteId}`;

    const [toDispatch, toCustomer] = await Promise.all([
      sendEmail({
        to: dispatchAddress,
        replyTo: quote.email ?? undefined,
        ...dispatchNotificationEmail(quote, context, panelUrl),
      }),
      quote.email && confirmToCustomer
        ? sendEmail({
            to: quote.email,
            replyTo: dispatchAddress,
            ...customerConfirmationEmail(quote, context),
          })
        : null,
    ]);

    await log(quoteId, "New-request alert", dispatchAddress, toDispatch);
    if (quote.email && toCustomer) await log(quoteId, "Confirmation", quote.email, toCustomer);
  } catch (error) {
    console.error("[email] Could not send notifications for a quote request", error);
  }
}

/**
 * Emails the customer their quote when a request becomes Quoted (booked). Runs after the
 * panel has saved, and never throws: the timeline records whether it went.
 */
export async function notifyQuoted(quoteId: string) {
  try {
    const [quote, { business, bands }] = await Promise.all([
      db().quoteRequest.findUnique({ where: { id: quoteId } }),
      getSiteContent(),
    ]);
    if (!quote || quote.status !== "QUOTED" || quote.quotedAmount === null || !quote.email) return;
    const data: QuoteEmailData & { quotedAmount: number } = {
      reference: quote.reference,
      originCity: quote.originCity,
      originState: quote.originState,
      destinationCity: quote.destinationCity,
      destinationState: quote.destinationState,
      material: quote.material,
      quantityKg: quote.quantityKg,
      loadType: quote.loadType,
      trucks: parseTruckPlan(quote.truckPlan),
      pickupDate: quote.pickupDate ? toIsoDate(quote.pickupDate) : null,
      notes: quote.notes,
      contactName: quote.contactName,
      companyName: quote.companyName,
      phone: quote.phone,
      email: quote.email,
      quotedAmount: quote.quotedAmount,
    };
    const dispatchAddress = business.alertEmail ?? business.email;
    const outcome = await sendEmail({ to: quote.email, replyTo: dispatchAddress, ...customerQuoteEmail(data, { business, bands }) });
    await log(quoteId, "Quote", quote.email, outcome);
  } catch (error) {
    console.error("[email] Could not send the quote for a request", error);
  }
}
