"use client";

import { useEffect, useRef } from "react";
import { CircleCheck, MessageCircle, Phone } from "lucide-react";
import { MATERIALS } from "@/config/materials";
import { site } from "@/config/site";
import { customerWhatsappMessage } from "@/features/quotes/messages";
import type { QuoteConfirmation } from "@/features/quotes/state";
import { formatIsoDate } from "@/lib/dates";
import { LOAD_TYPE_LABELS, formatKg, formatTrucks } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";

export function QuoteConfirmationPanel({
  confirmation,
  onReset,
}: {
  confirmation: QuoteConfirmation;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The form just disappeared; move focus so keyboard and screen-reader users land on the result.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const band = MATERIALS[confirmation.material];
  const rows = [
    { term: "From", detail: confirmation.origin },
    { term: "To", detail: confirmation.destination },
    { term: "Cargo", detail: `${band.label}, ${band.range}` },
    { term: "Weight", detail: formatKg(confirmation.quantityKg) },
    {
      term: "Vehicle",
      detail: `${formatTrucks(confirmation.trucks)}, ${LOAD_TYPE_LABELS[confirmation.loadType].toLowerCase()}`,
    },
    ...(confirmation.pickupDate
      ? [{ term: "Pickup", detail: formatIsoDate(confirmation.pickupDate) }]
      : []),
  ];

  return (
    <section
      aria-labelledby="quote-confirmation-title"
      className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-ink-950/40 ring-1 ring-white/10"
    >
      <div className="px-5 py-6 sm:px-6">
        <CircleCheck aria-hidden="true" className="size-9 text-success" />
        <h2
          id="quote-confirmation-title"
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 text-2xl font-bold tracking-tight text-ink-950 focus:outline-none"
        >
          Request received
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          Dispatch will contact you within {site.responseTime} with a quote. Our desk is open{" "}
          {site.hours.display}.
        </p>

        <div className="mt-6 rounded-lg border border-frost-200 bg-frost-50 px-4 py-3.5">
          <p className="caption text-ink-500">Your reference</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-wide text-ink-950">
            {confirmation.reference}
          </p>
        </div>
      </div>

      <dl className="border-t border-frost-200 px-5 py-2 sm:px-6">
        {rows.map((row) => (
          <div
            key={row.term}
            className="flex items-baseline justify-between gap-6 border-b border-frost-100 py-3 last:border-b-0"
          >
            <dt className="caption shrink-0 text-ink-500">{row.term}</dt>
            <dd className="text-right text-sm font-medium text-ink-950">{row.detail}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-frost-200 bg-frost-50 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={`tel:${site.phone.e164}`}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-ink-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
          >
            <Phone aria-hidden="true" className="size-4" />
            Call {site.phone.display}
          </a>
          {site.whatsapp ? (
            <a
              href={whatsappLink(site.whatsapp, customerWhatsappMessage(confirmation))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-frost-300 bg-white px-5 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-400"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              Message on WhatsApp
            </a>
          ) : null}
        </div>
        <p className="mt-4 text-center">
          <button
            type="button"
            onClick={onReset}
            className="rounded-sm text-sm font-medium text-ice-700 underline underline-offset-4 hover:text-ink-950"
          >
            Send another request
          </button>
        </p>
      </div>
    </section>
  );
}
