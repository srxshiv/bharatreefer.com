import { largestTruckKg, smallestTruckKg, type FleetConfig } from "@/config/fleet";
import type { BusinessInfo } from "@/config/site";
import { formatCapacity, formatKg } from "@/lib/format";
import { formatHours } from "@/lib/hours";
import { formatIndianMobile } from "@/lib/phone";
import type { Faq, Step, TruckSizeInfo } from "./types";

/**
 * Text generated from the other settings. Used until the business writes its own, so the
 * numbers in the copy always match the fleet and the hours.
 */

export const DEFAULT_HERO_INTRO =
  "Frozen, chilled and normal-temperature cargo, as a full truck or a part load. Send the route and the weight, and dispatch replies with a quote.";

/** "8 truck sizes, 900 kg to 22 tonnes": the fleet section's heading. */
export function automaticFleetTitle(trucks: TruckSizeInfo[], fleet: FleetConfig): string {
  const largest = largestTruckKg(fleet);
  const largestText = largest >= 1000 ? `${largest / 1000} tonnes` : formatCapacity(largest);
  const smallest = trucks[0]?.capacityKg ?? smallestTruckKg(fleet);
  return `${trucks.length} truck sizes, ${formatCapacity(smallest)} to ${largestText}`;
}

/** "Reefer trucks from 900 kg to 22 tonnes." */
export function automaticHeading(fleet: FleetConfig): string {
  const largest = largestTruckKg(fleet);
  const largestText = largest >= 1000 ? `${largest / 1000} tonnes` : formatCapacity(largest);
  return `Reefer trucks from ${formatCapacity(smallestTruckKg(fleet))} to ${largestText}.`;
}

export function automaticSteps(business: BusinessInfo): Step[] {
  return [
    {
      title: "Send the load details",
      body: "Route, temperature band and weight. The form takes about a minute.",
    },
    {
      title: "Get your quote",
      body: `Dispatch checks the route and the vehicle, then calls or emails you within ${business.responseTime}.`,
    },
    {
      title: "We load and move",
      body: "Confirm the quote and the truck reports to your loading point, set to your temperature band.",
    },
  ];
}

export function automaticFaqs(business: BusinessInfo, fleet: FleetConfig): Faq[] {
  const largest = largestTruckKg(fleet);
  const largestText = largest >= 1000 ? `${largest / 1000} tonnes` : formatCapacity(largest);
  return [
    {
      question: "What is the smallest load you take?",
      answer: `Consignments from ${formatKg(fleet.minQuantityKg)}. Small loads travel as a part load, sharing a truck with other cargo in the same temperature band.`,
    },
    {
      question: "What if my load is heavier than one truck?",
      answer: `One request can cover up to ${formatKg(fleet.maxQuantityKg)}. Anything over ${largestText} is planned across more than one truck.`,
    },
    {
      question: "How soon will I hear back?",
      answer: `Within ${business.responseTime}. The dispatch desk is open ${formatHours(business.hours)}.`,
    },
    {
      question: "Can I change the details after sending a request?",
      answer: `Yes. Call dispatch on ${formatIndianMobile(business.phone)} with your reference number and we will update the request.`,
    },
  ];
}
