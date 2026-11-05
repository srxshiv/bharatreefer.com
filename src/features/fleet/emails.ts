import type { BusinessInfo } from "@/config/site";
import { renderEmail, type RenderedEmail } from "@/lib/email-layout";
import { formatKg } from "@/lib/format";
import { formatHours } from "@/lib/hours";
import { formatIndianMobile } from "@/lib/phone";
import type { TrackedLoad } from "./tracking";

/** Sends a customer the tracking link for the truck carrying their load. `plate` as printed. */
export function trackingLinkEmail(load: TrackedLoad, plate: string, url: string, business: BusinessInfo): RenderedEmail {
  return renderEmail({
    brand: business.name,
    subject: `Track your load ${load.reference}: ${load.originCity} to ${load.destinationCity}`,
    heading: "Track your load",
    intro: `Hello ${load.contactName}, your load is on truck ${plate}. Follow it live with the link below.`,
    rows: [
      { label: "Reference", value: load.reference },
      { label: "From", value: load.originCity },
      { label: "To", value: load.destinationCity },
      { label: "Truck", value: plate },
      { label: "On this truck", value: formatKg(load.loadKg) },
    ],
    action: { label: "Track your load", url },
    footer: `Questions about the delivery? Call ${formatIndianMobile(business.phone)} (${formatHours(business.hours)}) and quote your reference.`,
  });
}
