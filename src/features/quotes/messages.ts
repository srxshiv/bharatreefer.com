import { MATERIALS, type MaterialId } from "@/config/materials";
import { site } from "@/config/site";
import { formatInr, formatKg } from "@/lib/format";

type Load = {
  reference: string;
  originCity: string;
  destinationCity: string;
  material: MaterialId;
  quantityKg: number;
};

function describe(load: Load): string {
  const band = MATERIALS[load.material].label.toLowerCase();
  return `${load.originCity} to ${load.destinationCity}, ${formatKg(load.quantityKg)} ${band}`;
}

/** WhatsApp message a customer sends to the business after requesting a quote. */
export function customerWhatsappMessage(load: Load): string {
  return `Hello, I sent quote request ${load.reference} on your website (${describe(load)}).`;
}

/** WhatsApp message dispatch sends to a customer about their request. */
export function dispatchWhatsappMessage(
  load: Load & { contactName: string; quotedAmount: number | null },
): string {
  const opening = `Hello ${load.contactName}, this is ${site.name} about your quote request ${load.reference} (${describe(load)}).`;
  return load.quotedAmount === null
    ? opening
    : `${opening} Our quote for this load is ${formatInr(load.quotedAmount)}.`;
}
