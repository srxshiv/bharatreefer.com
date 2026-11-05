import { formatKg } from "@/lib/format";

// A trip's tracking link: the live-location link from the truck's GPS tracker, or a shared
// Google Maps location, sent to the customers whose loads are on the truck. Plain functions,
// shared by the board in the browser and the server.

export const MAX_TRACKING_URL_LENGTH = 2000;

/** What the customer is told about their load. */
export type TrackedLoad = {
  reference: string;
  contactName: string;
  originCity: string;
  destinationCity: string;
  /** The weight of their request on this truck. */
  loadKg: number;
};

/**
 * The link as it will be sent, or null when it is not a web address. A link pasted without
 * "https://" (such as "maps.app.goo.gl/abc") gets it added.
 */
export function parseTrackingUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_TRACKING_URL_LENGTH || /\s/.test(trimmed)) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** WhatsApp message dispatch sends a customer with the tracking link. `plate` as printed. */
export function trackingWhatsappMessage(load: TrackedLoad, plate: string, url: string, businessName: string): string {
  return (
    `Hello ${load.contactName}, this is ${businessName}. Your load ${load.reference} ` +
    `(${load.originCity} to ${load.destinationCity}, ${formatKg(load.loadKg)}) is on truck ${plate}. ` +
    `Track it live here: ${url}`
  );
}

/** GPS tracker share links stop working after about two weeks; after that the panel asks for a new one. */
export const TRACKING_LINK_DAYS = 14;

const DAY_MS = 86_400_000;

/** Whether a truck's saved tracking link is young enough to still work. */
export function isTrackingLinkFresh(setAt: Date | string | null, now = Date.now()): boolean {
  if (!setAt) return false;
  return now - new Date(setAt).getTime() < TRACKING_LINK_DAYS * DAY_MS;
}

/**
 * When the customer is emailed which truck is coming: 8 am India time the day before pickup,
 * 24 hours before an 8 am pickup. A truck allotted later than that is announced at once.
 * `pickup` is "YYYY-MM-DD".
 */
export function truckNoticeDueAt(pickup: string): Date {
  const [year, month, day] = pickup.split("-").map(Number);
  // 8 am in India is 2:30 am UTC.
  return new Date(Date.UTC(year, month - 1, day) - DAY_MS + (2 * 60 + 30) * 60_000);
}
