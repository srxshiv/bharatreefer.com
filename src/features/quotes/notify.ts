import "server-only";
import { siteUrl } from "@/config/site";
import { PANEL_HOME } from "@/features/auth/cookie";
import { getSiteContent } from "@/features/content/data";
import { sendEmail, type EmailOutcome } from "@/lib/email";
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
