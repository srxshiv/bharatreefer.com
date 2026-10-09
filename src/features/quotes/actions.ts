"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { site } from "@/config/site";
import { clientIp, hashIp } from "@/lib/request";
import { generateReference } from "@/lib/reference";
import { planTrucks, type TruckPlan } from "@/lib/truck-plan";
import { countQuoteRequestsFrom, createQuoteRequest } from "./data";
import { notifyNewQuoteRequest } from "./notify";
import {
  QUOTE_FIELDS,
  quoteRequestSchema,
  toFieldErrors,
  type QuoteFormValues,
  type QuoteRequestInput,
} from "./schema";
import type { QuoteConfirmation, QuoteFormState } from "./state";

/** Requests accepted from one IP address inside the window before we ask them to call instead. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** Hidden field real visitors never fill in. */
const HONEYPOT_FIELD = "website";

const CALL_US = `Please call us on ${site.phone.display}.`;

function readValues(formData: FormData): QuoteFormValues {
  const values = {} as QuoteFormValues;
  for (const field of QUOTE_FIELDS) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

function confirmationFor(
  reference: string,
  input: QuoteRequestInput,
  plan: TruckPlan,
): QuoteConfirmation {
  return {
    reference,
    origin: `${input.originCity}, ${input.originState}`,
    destination: `${input.destinationCity}, ${input.destinationState}`,
    originCity: input.originCity,
    destinationCity: input.destinationCity,
    material: input.material,
    quantityKg: input.quantityKg,
    loadType: plan.loadType,
    trucks: plan.trucks,
    pickupDate: input.pickupDate ?? null,
  };
}

export async function submitQuoteRequest(formData: FormData): Promise<QuoteFormState> {
  const parsed = quoteRequestSchema.safeParse(readValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const input = parsed.data;
  const plan = planTrucks(input.quantityKg);
  if (!plan) {
    return { status: "error", fieldErrors: { quantityKg: "Enter the weight in kilograms" } };
  }

  // Bots that fill every field get a normal-looking confirmation and nothing is stored.
  if (formData.get(HONEYPOT_FIELD)) {
    return { status: "success", confirmation: confirmationFor(generateReference(), input, plan) };
  }

  try {
    const requestHeaders = await headers();
    const ip = clientIp(requestHeaders);
    const ipHash = ip ? hashIp(ip) : null;

    if (ipHash) {
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
      if ((await countQuoteRequestsFrom(ipHash, since)) >= RATE_LIMIT_MAX) {
        return {
          status: "error",
          message: `We have received several requests from you in the last hour. ${CALL_US}`,
        };
      }
    }

    const { id, reference } = await createQuoteRequest(input, plan, {
      ipHash,
      userAgent: requestHeaders.get("user-agent")?.slice(0, 400) ?? null,
    });

    // Emails go out once the customer already has their confirmation screen.
    after(() =>
      notifyNewQuoteRequest(id, {
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
      }),
    );

    return { status: "success", confirmation: confirmationFor(reference, input, plan) };
  } catch (error) {
    console.error("Failed to store quote request", error);
    return {
      status: "error",
      message: `We could not send your request just now. ${CALL_US}`,
    };
  }
}
