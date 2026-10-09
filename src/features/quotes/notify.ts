import "server-only";
import { site, siteUrl } from "@/config/site";
import { sendEmail, type EmailOutcome } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { recordNotification } from "./data";
import {
  customerConfirmationEmail,
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
 * address. Runs after the customer already has their confirmation screen, and never
 * throws, so a mail problem cannot affect the request itself.
 */
export async function notifyNewQuoteRequest(quoteId: string, quote: QuoteEmailData) {
  try {
    const dispatchAddress = serverEnv().DISPATCH_EMAIL ?? site.email;
    const adminUrl = `${siteUrl}/admin/quotes/${quoteId}`;

    const [toDispatch, toCustomer] = await Promise.all([
      sendEmail({
        to: dispatchAddress,
        replyTo: quote.email ?? undefined,
        ...dispatchNotificationEmail(quote, adminUrl),
      }),
      quote.email
        ? sendEmail({
            to: quote.email,
            replyTo: dispatchAddress,
            ...customerConfirmationEmail(quote),
          })
        : null,
    ]);

    await log(quoteId, "New-request alert", dispatchAddress, toDispatch);
    if (quote.email && toCustomer) await log(quoteId, "Confirmation", quote.email, toCustomer);
  } catch (error) {
    console.error("[email] Could not send notifications for a quote request", error);
  }
}
