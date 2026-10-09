import { MATERIALS, type MaterialId } from "@/config/materials";
import { site } from "@/config/site";
import { formatIsoDate } from "@/lib/dates";
import { LOAD_TYPE_LABELS, formatKg, formatTrucks } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import type { LoadTypeId, TruckAllocation } from "@/lib/truck-plan";

/** Everything the notification emails say about a quote request. */
export type QuoteEmailData = {
  reference: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  material: MaterialId;
  quantityKg: number;
  loadType: LoadTypeId;
  trucks: TruckAllocation[];
  /** "YYYY-MM-DD" */
  pickupDate: string | null;
  notes: string | null;
  contactName: string;
  /** E.164 */
  phone: string;
  email: string | null;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

type Row = { label: string; value: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cargo(quote: QuoteEmailData): string {
  const band = MATERIALS[quote.material];
  return `${band.label} (${band.range})`;
}

function vehicle(quote: QuoteEmailData): string {
  return `${formatTrucks(quote.trucks)}, ${LOAD_TYPE_LABELS[quote.loadType].toLowerCase()}`;
}

function loadRows(quote: QuoteEmailData): Row[] {
  return [
    { label: "From", value: `${quote.originCity}, ${quote.originState}` },
    { label: "To", value: `${quote.destinationCity}, ${quote.destinationState}` },
    { label: "Cargo", value: cargo(quote) },
    { label: "Weight", value: formatKg(quote.quantityKg) },
    { label: "Vehicle", value: vehicle(quote) },
    ...(quote.pickupDate ? [{ label: "Pickup", value: formatIsoDate(quote.pickupDate) }] : []),
    ...(quote.notes ? [{ label: "Notes", value: quote.notes }] : []),
  ];
}

/** Wraps the content in the shared email layout. Every string is escaped here. */
function render(parts: {
  subject: string;
  heading: string;
  intro: string;
  rows: Row[];
  action?: { label: string; url: string };
  footer: string;
}): RenderedEmail {
  const rows = parts.rows
    .map(
      (row) => `
            <tr>
              <td style="padding:10px 16px 10px 0;border-top:1px solid #e8eff2;font-size:13px;color:#55707f;vertical-align:top;white-space:nowrap;">${escapeHtml(row.label)}</td>
              <td style="padding:10px 0;border-top:1px solid #e8eff2;font-size:15px;font-weight:600;color:#06131b;">${escapeHtml(row.value).replace(/\r?\n/g, "<br>")}</td>
            </tr>`,
    )
    .join("");

  const action = parts.action
    ? `
          <p style="margin:24px 0 0;">
            <a href="${escapeHtml(parts.action.url)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#06131b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(parts.action.label)}</a>
          </p>`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f8f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a1c27;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8f9;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d6e1e6;border-radius:12px;">
            <tr>
              <td style="padding:18px 24px;border-radius:12px 12px 0 0;background:#06131b;color:#ffffff;font-size:16px;font-weight:700;">${escapeHtml(site.name)}</td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#06131b;">${escapeHtml(parts.heading)}</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#55707f;">${escapeHtml(parts.intro)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
                </table>${action}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid #e8eff2;font-size:13px;line-height:1.6;color:#55707f;">${escapeHtml(parts.footer)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    parts.heading,
    "",
    parts.intro,
    "",
    ...parts.rows.map((row) => `${row.label}: ${row.value}`),
    ...(parts.action ? ["", `${parts.action.label}: ${parts.action.url}`] : []),
    "",
    parts.footer,
  ].join("\n");

  return { subject: parts.subject, html, text };
}

/** Tells dispatch a new request has arrived. `adminUrl` opens it in the admin panel. */
export function dispatchNotificationEmail(quote: QuoteEmailData, adminUrl: string): RenderedEmail {
  const band = MATERIALS[quote.material].label.toLowerCase();
  return render({
    subject: `New quote request ${quote.reference}: ${quote.originCity} to ${quote.destinationCity}, ${formatKg(quote.quantityKg)} ${band}`,
    heading: `New quote request ${quote.reference}`,
    intro: `${quote.contactName} asked for a quote from the website.`,
    rows: [
      { label: "Customer", value: quote.contactName },
      { label: "Phone", value: `+91 ${formatIndianMobile(quote.phone)}` },
      ...(quote.email ? [{ label: "Email", value: quote.email }] : []),
      ...loadRows(quote),
    ],
    action: { label: "Open in admin panel", url: adminUrl },
    footer: quote.email
      ? "Reply to this email to write to the customer directly."
      : "The customer did not leave an email address. Call them on the number above.",
  });
}

/** Confirms to the customer that the request arrived and what happens next. */
export function customerConfirmationEmail(quote: QuoteEmailData): RenderedEmail {
  return render({
    subject: `We received your quote request ${quote.reference}`,
    heading: "Your quote request is with dispatch",
    intro: `Thank you, ${quote.contactName}. Our dispatch desk will contact you within ${site.responseTime} with a quote.`,
    rows: [{ label: "Reference", value: quote.reference }, ...loadRows(quote)],
    footer: `Need to change something, or in a hurry? Call ${site.phone.display} (${site.hours.display}) and quote your reference.`,
  });
}
