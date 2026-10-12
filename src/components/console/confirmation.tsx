"use client";

import { useEffect, useRef } from "react";
import { CircleCheck, MessageCircle, Phone } from "lucide-react";
import type { BusinessInfo } from "@/config/site";
import type { MaterialId, TemperatureBandInfo } from "@/config/materials";
import { customerWhatsappMessage, type BandLabels } from "@/features/quotes/messages";
import type { QuoteConfirmation } from "@/features/quotes/state";
import { formatIsoDate } from "@/lib/dates";
import { LOAD_TYPE_LABELS, formatKg, formatTrucks } from "@/lib/format";
import { formatHours } from "@/lib/hours";
import { formatIndianMobile } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { primaryButton, secondaryButton } from "./ui";

export function Confirmation({
  confirmation,
  business,
  bands,
  onReset,
}: {
  confirmation: QuoteConfirmation;
  business: BusinessInfo;
  bands: Record<MaterialId, TemperatureBandInfo>;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The form just disappeared; move focus so keyboard and screen-reader users land on the result.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const band = bands[confirmation.material];
  const bandLabels = Object.fromEntries(
    (Object.keys(bands) as MaterialId[]).map((id) => [id, bands[id].label]),
  ) as BandLabels;
  const rows = [
    { label: "From", value: `${confirmation.originCity}, ${confirmation.originState}` },
    { label: "To", value: `${confirmation.destinationCity}, ${confirmation.destinationState}` },
    { label: "Cargo", value: `${band.label}, ${band.range}` },
    { label: "Weight", value: formatKg(confirmation.quantityKg) },
    {
      label: "Vehicle",
      value: `${formatTrucks(confirmation.trucks)}, ${LOAD_TYPE_LABELS[confirmation.loadType].toLowerCase()}`,
    },
    ...(confirmation.pickupDate ? [{ label: "Pickup", value: formatIsoDate(confirmation.pickupDate) }] : []),
  ];

  return (
    <section aria-labelledby="quote-confirmation-title" className="flex flex-col gap-5">
      <div>
        <CircleCheck aria-hidden="true" className="size-10 text-success" strokeWidth={1.5} />
        <h3
          id="quote-confirmation-title"
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 text-2xl/tight font-semibold tracking-tight text-navy-950 focus:outline-none"
        >
          Request received.
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          Dispatch will contact you within {business.responseTime} with a quote. The desk is open{" "}
          {formatHours(business.hours)}.
        </p>
      </div>

      <div className="rounded-xl bg-navy-900 px-5 py-4 text-white">
        <p className="caption text-ice-300">Your reference</p>
        <p className="mt-1.5 font-mono text-2xl tracking-wider">{confirmation.reference}</p>
        <p className="mt-1.5 text-xs text-ice-200">Quote it if you call or message us about this load.</p>
      </div>

      <dl className="divide-y divide-frost-200 rounded-xl border border-frost-200 px-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-6 py-2.5 text-sm">
            <dt className="text-ink-500">{row.label}</dt>
            <dd className="text-right font-medium text-ink-950">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a href={`tel:${business.phone}`} className={primaryButton}>
          <Phone aria-hidden="true" className="size-4" />
          Call {formatIndianMobile(business.phone)}
        </a>
        {business.whatsapp ? (
          <a
            href={whatsappLink(business.whatsapp, customerWhatsappMessage(confirmation, bandLabels))}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryButton}
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            WhatsApp
          </a>
        ) : null}
      </div>

      <p>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md text-sm font-medium text-ink-500 underline decoration-frost-400 underline-offset-4 transition-colors hover:text-navy-900"
        >
          Send another request
        </button>
      </p>
    </section>
  );
}
