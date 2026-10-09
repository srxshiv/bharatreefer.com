import "server-only";
import { serverEnv } from "@/lib/env";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type EmailOutcome =
  | { status: "sent" }
  /** Email is not configured (no API key), so nothing was sent. */
  | { status: "skipped" }
  | { status: "failed"; reason: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

/**
 * Sends one email through Resend. Never throws: callers get an outcome to log,
 * because a mail outage must not break the request that triggered the email.
 */
export async function sendEmail(email: OutgoingEmail): Promise<EmailOutcome> {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv();
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    console.info(`[email] Not configured. Skipped "${email.subject}" to ${email.to}.`);
    return { status: "skipped" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: email.replyTo,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) return { status: "sent" };

    const detail = (await response.text()).slice(0, 300);
    return { status: "failed", reason: `Resend responded ${response.status}: ${detail}` };
  } catch (error) {
    return { status: "failed", reason: error instanceof Error ? error.message : String(error) };
  }
}
