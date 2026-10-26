import { renderEmail, type RenderedEmail } from "@/lib/email-layout";

/** Sends a team member the link that lets them choose a new password. */
export function passwordResetEmail(parts: {
  brand: string;
  name: string;
  email: string;
  url: string;
  validMinutes: number;
}): RenderedEmail {
  return renderEmail({
    brand: parts.brand,
    subject: `Reset your ${parts.brand} desk password`,
    heading: "Choose a new password",
    intro: `Hi ${parts.name}, someone asked to reset the password for your ${parts.brand} desk account. The button below works once, for the next ${parts.validMinutes} minutes.`,
    rows: [{ label: "Account", value: parts.email }],
    action: { label: "Choose a new password", url: parts.url },
    footer: "Did not ask for this? Ignore this email. Your password stays as it is.",
  });
}
