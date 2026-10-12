import type { MaterialId } from "@/config/materials";
import { formatInr, formatKg } from "@/lib/format";

type Load = {
  reference: string;
  originCity: string;
  destinationCity: string;
  material: MaterialId;
  quantityKg: number;
};

/** Band labels for the message text, keyed by material id. */
export type BandLabels = Record<MaterialId, string>;

function describe(load: Load, labels: BandLabels): string {
  return `${load.originCity} to ${load.destinationCity}, ${formatKg(load.quantityKg)} ${labels[load.material].toLowerCase()}`;
}

/** WhatsApp message a customer sends to the business after requesting a quote. */
export function customerWhatsappMessage(load: Load, labels: BandLabels): string {
  return `Hello, I sent quote request ${load.reference} on your website (${describe(load, labels)}).`;
}

/** WhatsApp message dispatch sends to a customer about their request. */
export function dispatchWhatsappMessage(
  load: Load & { contactName: string; quotedAmount: number | null },
  businessName: string,
  labels: BandLabels,
): string {
  const opening = `Hello ${load.contactName}, this is ${businessName} about your quote request ${load.reference} (${describe(load, labels)}).`;
  return load.quotedAmount === null
    ? opening
    : `${opening} Our quote for this load is ${formatInr(load.quotedAmount)}.`;
}

/** Opening message for the general "WhatsApp us" link on the public site. */
export const GENERAL_WHATSAPP_MESSAGE = "Hello, I would like a quote for a refrigerated load.";
