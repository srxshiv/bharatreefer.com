import type { BusinessInfo } from "@/config/site";
import { renderEmail, type RenderedEmail } from "@/lib/email-layout";
import { formatIsoDate } from "@/lib/dates";
import { formatCapacity, formatKg } from "@/lib/format";
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

/** A truck carrying (part of) the customer's load, for the notice the day before pickup. */
export type NoticeTruck = {
  /** As printed, e.g. "HR 55 AR 6518". */
  plate: string;
  capacityKg: number;
  /** How much of their load is on this truck. */
  loadKg: number;
  driverName: string | null;
  /** E.164 */
  driverPhone: string | null;
  /** The truck's live location link, when it has a working one. */
  trackingUrl: string | null;
};

/**
 * Tells the customer which truck is coming for their load, the day before pickup (or at once
 * when it is allotted later): the truck, the driver and, if there is one, the live location.
 */
export function truckNoticeEmail(
  load: Omit<TrackedLoad, "loadKg"> & { pickupDate: string },
  trucks: NoticeTruck[],
  business: BusinessInfo,
): RenderedEmail {
  const plates = trucks.map((truck) => truck.plate).join(", ");
  const several = trucks.length > 1;
  const links = trucks.filter((truck) => truck.trackingUrl);
  return renderEmail({
    brand: business.name,
    subject: `Your truck for ${load.reference}: ${plates}, pickup ${formatIsoDate(load.pickupDate)}`,
    heading: several ? "Your trucks are booked" : "Your truck is booked",
    intro: `Hello ${load.contactName}, ${several ? "these trucks are" : "this truck is"} coming for your load on ${formatIsoDate(load.pickupDate)}.`,
    rows: [
      { label: "Reference", value: load.reference },
      { label: "Pickup", value: formatIsoDate(load.pickupDate) },
      { label: "From", value: load.originCity },
      { label: "To", value: load.destinationCity },
      ...trucks.flatMap((truck, index) => {
        const label = several ? `Truck ${index + 1}` : "Truck";
        return [
          { label, value: `${truck.plate}, ${formatCapacity(truck.capacityKg)} truck, ${formatKg(truck.loadKg)} of your load` },
          ...(truck.driverName || truck.driverPhone
            ? [{ label: several ? `Driver ${index + 1}` : "Driver", value: [truck.driverName, truck.driverPhone ? `+91 ${formatIndianMobile(truck.driverPhone)}` : null].filter(Boolean).join(", ") }]
            : []),
          ...(several && truck.trackingUrl ? [{ label: `Live location ${index + 1}`, value: truck.trackingUrl }] : []),
        ];
      }),
    ],
    ...(links.length === 1 ? { action: { label: "Track your truck", url: links[0].trackingUrl! } } : {}),
    footer: `Questions on the day? Call ${formatIndianMobile(business.phone)} (${formatHours(business.hours)}) and quote your reference.`,
  });
}
