import type { MaterialId, TemperatureBandInfo } from "@/config/materials";
import type { BusinessInfo } from "@/config/site";
import { formatIsoDate } from "@/lib/dates";
import { renderEmail, type EmailRow, type RenderedEmail } from "@/lib/email-layout";
import { LOAD_TYPE_LABELS, formatKg, formatTrucks } from "@/lib/format";
import { formatHours } from "@/lib/hours";
import { formatIndianMobile } from "@/lib/phone";
import type { LoadTypeId, TruckAllocation, TruckPlan } from "@/lib/truck-plan";
import type { QuoteRequestInput } from "./schema";

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
  /** Who entered it for the customer, e.g. "Priya Sharma (staff)". Left out for website requests. */
  createdBy?: string;
  /** The promo code given and whose it is, e.g. "PRIYA (Priya Sharma)". */
  promoCode?: string;
};

/** What the emails say about a request that has just been stored. */
export function quoteEmailData(reference: string, input: QuoteRequestInput, plan: TruckPlan): QuoteEmailData {
  return {
    reference,
    originCity: input.originCity,
    originState: input.originState,
    destinationCity: input.destinationCity,
    destinationState: input.destinationState,
    material: input.material,
    quantityKg: input.quantityKg,
    loadType: plan.loadType,
    trucks: plan.trucks,
    pickupDate: input.pickupDate ?? null,
    notes: input.notes ?? null,
    contactName: input.contactName,
    phone: input.phone,
    email: input.email ?? null,
  };
}

/** The business details the emails mention. */
export type EmailContext = {
  business: BusinessInfo;
  bands: Record<MaterialId, TemperatureBandInfo>;
};

function vehicle(quote: QuoteEmailData): string {
  return `${formatTrucks(quote.trucks)}, ${LOAD_TYPE_LABELS[quote.loadType].toLowerCase()}`;
}

function loadRows(quote: QuoteEmailData, context: EmailContext): EmailRow[] {
  const band = context.bands[quote.material];
  return [
    { label: "From", value: `${quote.originCity}, ${quote.originState}` },
    { label: "To", value: `${quote.destinationCity}, ${quote.destinationState}` },
    { label: "Cargo", value: `${band.label} (${band.range})` },
    { label: "Weight", value: formatKg(quote.quantityKg) },
    { label: "Vehicle", value: vehicle(quote) },
    ...(quote.pickupDate ? [{ label: "Pickup", value: formatIsoDate(quote.pickupDate) }] : []),
    ...(quote.notes ? [{ label: "Notes", value: quote.notes }] : []),
  ];
}

/** Tells dispatch a new request has arrived. `panelUrl` opens it in the panel. */
export function dispatchNotificationEmail(
  quote: QuoteEmailData,
  context: EmailContext,
  panelUrl: string,
): RenderedEmail {
  const band = context.bands[quote.material].label.toLowerCase();
  return renderEmail({
    brand: context.business.name,
    subject: `New quote request ${quote.reference}: ${quote.originCity} to ${quote.destinationCity}, ${formatKg(quote.quantityKg)} ${band}`,
    heading: `New quote request ${quote.reference}`,
    intro: quote.createdBy
      ? `${quote.createdBy} entered this request for ${quote.contactName}.`
      : `${quote.contactName} asked for a quote from the website.`,
    rows: [
      { label: "Customer", value: quote.contactName },
      { label: "Phone", value: `+91 ${formatIndianMobile(quote.phone)}` },
      ...(quote.email ? [{ label: "Email", value: quote.email }] : []),
      ...(quote.promoCode ? [{ label: "Promo code", value: quote.promoCode }] : []),
      ...loadRows(quote, context),
    ],
    action: { label: "Open request", url: panelUrl },
    footer: quote.email
      ? "Reply to this email to write to the customer directly."
      : "The customer did not leave an email address. Call them on the number above.",
  });
}

/** Confirms to the customer that the request arrived and what happens next. */
export function customerConfirmationEmail(quote: QuoteEmailData, context: EmailContext): RenderedEmail {
  const { business } = context;
  return renderEmail({
    brand: business.name,
    subject: `We received your quote request ${quote.reference}`,
    heading: "Your quote request is with dispatch",
    intro: `Thank you, ${quote.contactName}. Our dispatch desk will contact you within ${business.responseTime} with a quote.`,
    rows: [{ label: "Reference", value: quote.reference }, ...loadRows(quote, context)],
    footer: `Need to change something, or in a hurry? Call ${formatIndianMobile(business.phone)} (${formatHours(business.hours)}) and quote your reference.`,
  });
}
