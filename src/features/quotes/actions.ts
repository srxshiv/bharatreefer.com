"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { getSiteContent } from "@/features/content/data";
import { formatIndianMobile } from "@/lib/phone";
import { clientIp, hashIp } from "@/lib/request";
import { generateReference } from "@/lib/reference";
import { planTrucks, type TruckPlan } from "@/lib/truck-plan";
import { countQuoteRequestsFrom, createQuoteRequest, findReferrer } from "./data";
import { quoteEmailData } from "./emails";
import { notifyNewQuoteRequest } from "./notify";
import {
  UNKNOWN_PROMO_CODE,
  createQuoteRequestSchema,
  readQuoteForm,
  toFieldErrors,
  type QuoteRequestInput,
} from "./schema";
import type { QuoteConfirmation, QuoteFormState } from "./state";

/** Requests accepted from one IP address inside the window before we ask them to call instead. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** Hidden field real visitors never fill in. */
const HONEYPOT_FIELD = "website";

function confirmationFor(
  reference: string,
  input: QuoteRequestInput,
  plan: TruckPlan,
): QuoteConfirmation {
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
    contactName: input.contactName,
    phone: input.phone,
  };
}

export async function submitQuoteRequest(formData: FormData): Promise<QuoteFormState> {
  const { fleet, business } = await getSiteContent();
  const callUs = `Please call us on ${formatIndianMobile(business.phone)}.`;

  const parsed = createQuoteRequestSchema(fleet).safeParse(readQuoteForm(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const input = parsed.data;
  const plan = planTrucks(input.quantityKg, fleet);
  if (!plan) {
    return { status: "error", fieldErrors: { quantityKg: "Enter the weight in kilograms" } };
  }

  // Bots that fill every field get a normal-looking confirmation and nothing is stored.
  if (formData.get(HONEYPOT_FIELD)) {
    return { status: "success", confirmation: confirmationFor(generateReference(), input, plan) };
  }

  try {
    // The request is credited to the team member whose code it is. An unknown code is pointed
    // out rather than dropped, so the customer can correct it or leave it out.
    const referrer = input.promoCode ? await findReferrer(input.promoCode) : null;
    if (input.promoCode && !referrer) {
      return { status: "error", message: "Please check the highlighted fields.", fieldErrors: { promoCode: UNKNOWN_PROMO_CODE } };
    }

    const requestHeaders = await headers();
    const ip = clientIp(requestHeaders);
    const ipHash = ip ? hashIp(ip) : null;

    if (ipHash) {
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
      if ((await countQuoteRequestsFrom(ipHash, since)) >= RATE_LIMIT_MAX) {
        return {
          status: "error",
          message: `We have received several requests from you in the last hour. ${callUs}`,
        };
      }
    }

    const { id, reference } = await createQuoteRequest(input, plan, {
      ipHash,
      userAgent: requestHeaders.get("user-agent")?.slice(0, 400) ?? null,
      referrer,
    });

    // Emails go out once the customer already has their confirmation screen.
    const emailData = {
      ...quoteEmailData(reference, input, plan),
      ...(referrer ? { promoCode: `${referrer.promoCode} (${referrer.name})` } : {}),
    };
    after(() => notifyNewQuoteRequest(id, emailData));

    return { status: "success", confirmation: confirmationFor(reference, input, plan) };
  } catch (error) {
    console.error("Failed to store quote request", error);
    return {
      status: "error",
      message: `We could not send your request just now. ${callUs}`,
    };
  }
}
