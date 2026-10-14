import { CalendarClock, Clock, Mail, MapPin, MessageCircle, Phone, Thermometer, Timer, Truck } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import { largestTruckKg, smallestTruckKg, type FleetConfig } from "@/config/fleet";
import { MATERIAL_IDS, type MaterialId, type TemperatureBandInfo } from "@/config/materials";
import type { BusinessInfo } from "@/config/site";
import { automaticFleetTitle } from "@/features/content/automatic";
import type { PageSection } from "@/features/content/sections";
import type { Faq, FleetPhotoInfo, RouteInfo, SiteCopy, TruckSizeInfo } from "@/features/content/types";
import { GENERAL_WHATSAPP_MESSAGE } from "@/features/quotes/messages";
import { cn } from "@/lib/cn";
import { formatCapacity } from "@/lib/format";
import { formatHours } from "@/lib/hours";
import { formatIndianMobile } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { DeskStatus } from "./desk-status";
import { RouteButton } from "./route-button";
import { card, primaryButton, secondaryButton } from "./ui";

/** The brand column: who the business is, what it carries, how to reach it. Server-rendered. */

/** "Sector-17, Rohini, Delhi" rather than "Delhi, Delhi" when the city is also the state. */
export function formatAddress(address: BusinessInfo["address"]): string {
  const parts = [address.street, address.city];
  if (address.region.toLowerCase() !== address.city.toLowerCase()) parts.push(address.region);
  return parts.join(", ");
}

function tonnes(kg: number): string {
  return kg >= 1000 ? `${kg / 1000} tonnes` : formatCapacity(kg);
}

/** A section's label, heading and introduction, as set in the admin panel. Empty text is left out. */
function SectionHeading({ section, automaticTitle = "" }: { section: PageSection; automaticTitle?: string }) {
  return (
    <div className="mb-5">
      {section.eyebrow ? <p className="caption text-ice-600">{section.eyebrow}</p> : null}
      <h2 id={`${section.id}-title`} className={cn("text-2xl/tight font-semibold tracking-tight text-navy-950", section.eyebrow && "mt-2")}>
        {section.title ?? automaticTitle}
      </h2>
      {section.intro ? <p className="mt-2.5 max-w-prose text-[15px] leading-7 text-ink-600">{section.intro}</p> : null}
    </div>
  );
}

export function Hero({
  business,
  copy,
  fleet,
  bands,
  showFacts,
}: {
  business: BusinessInfo;
  copy: SiteCopy;
  fleet: FleetConfig;
  bands: Record<MaterialId, TemperatureBandInfo>;
  showFacts: boolean;
}) {
  const facts = [
    {
      Icon: Truck,
      value: `${formatCapacity(smallestTruckKg(fleet))} to ${formatCapacity(largestTruckKg(fleet))}`,
      label: `${fleet.capacitiesKg.length} truck sizes`,
    },
    {
      Icon: Thermometer,
      value: `${bands.FROZEN.label}, ${bands.CHILLED.label.toLowerCase()}, ${bands.AMBIENT.label.toLowerCase()}`,
      label: "Three temperature bands",
    },
    {
      Icon: Timer,
      value: `Reply in ${business.responseTime}`,
      label: "On every quote request",
    },
  ];

  return (
    <section aria-labelledby="hero-title">
      <p className="caption text-ice-600">{business.tagline}</p>
      <h1
        id="hero-title"
        className="mt-3 text-[2.25rem]/[1.1] font-semibold tracking-tight text-navy-950 lg:text-[2.75rem]/[1.08]"
      >
        {copy.heroHeading}
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-ink-600">{copy.heroIntro}</p>
      <div aria-hidden="true" className="tricolour mt-6 h-1 w-24 rounded-full" />

      {showFacts ? (
        <dl className="mt-7 grid gap-3 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className={cn(card, "flex items-center gap-3 px-4 py-3.5")}>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ice-50 text-ice-600">
                <fact.Icon aria-hidden="true" className="size-4.5" />
              </span>
              <div className="min-w-0">
                <dd className="text-sm/5 font-semibold text-navy-950">{fact.value}</dd>
                <dt className="mt-0.5 text-xs text-ink-500">{fact.label}</dt>
              </div>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

export function Bands({ section, bands }: { section: PageSection; bands: Record<MaterialId, TemperatureBandInfo> }) {
  return (
    <section aria-labelledby="bands-title">
      <SectionHeading section={section} />
      <ul className="grid gap-4 sm:grid-cols-3">
        {MATERIAL_IDS.map((id) => {
          const band = bands[id];
          return (
            <li key={id} className={cn(card, "border-t-4 p-5", BAND_STYLES[id].rule)}>
              <p className="text-base font-semibold text-navy-950">{band.label}</p>
              <p className={cn("mt-1 font-mono text-lg font-medium", BAND_STYLES[id].text)}>{band.range}</p>
              <p className="mt-3 text-sm leading-6 text-ink-600">{band.summary}</p>
              {band.examples.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {band.examples.map((example) => (
                    <li key={example} className={cn("rounded-md px-2 py-0.5 text-xs text-ink-700", BAND_STYLES[id].soft)}>
                      {example}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Fleet({
  section,
  trucks,
  fleet,
  photos,
}: {
  section: PageSection;
  trucks: TruckSizeInfo[];
  fleet: FleetConfig;
  photos: FleetPhotoInfo[];
}) {
  const largest = largestTruckKg(fleet);
  const named = trucks.some((truck) => truck.name);

  return (
    <section aria-labelledby="fleet-title">
      <SectionHeading section={section} automaticTitle={automaticFleetTitle(trucks, fleet)} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className={cn(card, "px-5 py-2")}>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Payload per truck size</caption>
            <thead>
              <tr className="caption text-ink-400">
                <th scope="col" className="py-2.5 text-left font-medium">
                  Payload
                </th>
                {named ? (
                  <th scope="col" className="py-2.5 text-left font-medium">
                    Truck
                  </th>
                ) : null}
                <th scope="col" className="py-2.5 text-right font-medium">
                  Size
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-frost-200">
              {trucks.map((truck) => (
                <tr key={truck.capacityKg}>
                  <td className="py-2.5 pr-4 font-mono whitespace-nowrap text-navy-950">{formatCapacity(truck.capacityKg)}</td>
                  {named ? <td className="py-2.5 pr-4 text-ink-500">{truck.name ?? "—"}</td> : null}
                  <td className="w-[45%] py-2.5 pl-4">
                    <span className="block h-1.5 rounded-full bg-frost-100">
                      <span
                        className="block h-full rounded-full bg-ice-500"
                        style={{ width: `${(truck.capacityKg / largest) * 100}%` }}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className={cn(card, "p-5")}>
            <dt className="text-base font-semibold text-navy-950">Full load</dt>
            <dd className="mt-1.5 text-sm leading-6 text-ink-600">
              A dedicated truck sized to your consignment. Loads heavier than {tonnes(largest)} are split across more than one truck.
            </dd>
          </div>
          <div className={cn(card, "p-5")}>
            <dt className="text-base font-semibold text-navy-950">Part load</dt>
            <dd className="mt-1.5 text-sm leading-6 text-ink-600">
              Smaller consignments share a truck with other cargo in the same temperature band heading the same way.
            </dd>
          </div>
        </dl>
      </div>

      {photos.length > 0 ? (
        <figure className="mt-5">
          <figcaption className="caption mb-3 text-ink-400">Our trucks</figcaption>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.id} className={cn(card, "overflow-hidden")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- served from our own database, not an optimisable asset */}
                <img
                  src={`/media/fleet/${photo.id}`}
                  alt={photo.caption}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  className="aspect-4/3 w-full bg-frost-100 object-cover"
                />
                <p className="px-3 py-2 text-xs text-ink-600">{photo.caption}</p>
              </li>
            ))}
          </ul>
        </figure>
      ) : null}
    </section>
  );
}

export function Steps({ section, copy }: { section: PageSection; copy: SiteCopy }) {
  return (
    <section aria-labelledby="steps-title">
      <SectionHeading section={section} />
      <ol className="grid gap-4 sm:grid-cols-3">
        {copy.steps.map((step, index) => (
          <li key={step.title} className={cn(card, "p-5")}>
            <span className="grid size-8 place-items-center rounded-full bg-navy-900 font-mono text-xs text-white">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="mt-4 text-base font-semibold text-navy-950">{step.title}</p>
            <p className="mt-1.5 text-sm leading-6 text-ink-600">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Contact({ section, business }: { section: PageSection; business: BusinessInfo }) {
  const details = [
    {
      Icon: Mail,
      label: "Email",
      value: (
        <a href={`mailto:${business.email}`} className="underline decoration-frost-400 underline-offset-4 hover:decoration-ice-500">
          {business.email}
        </a>
      ),
    },
    { Icon: MapPin, label: "Dispatch office", value: formatAddress(business.address) },
    { Icon: Clock, label: "Desk hours", value: formatHours(business.hours) },
    { Icon: Clock, label: "Right now", value: <DeskStatus hours={business.hours} className="inline-flex" /> },
  ];

  return (
    <section aria-labelledby="contact-title">
      <SectionHeading section={section} />

      <div className="flex flex-wrap gap-3">
        <a href={`tel:${business.phone}`} className={primaryButton}>
          <Phone aria-hidden="true" className="size-4" />
          Call {formatIndianMobile(business.phone)}
        </a>
        {business.whatsapp ? (
          <a
            href={whatsappLink(business.whatsapp, GENERAL_WHATSAPP_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryButton}
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            WhatsApp
          </a>
        ) : null}
      </div>

      <dl className={cn(card, "mt-5 grid gap-px overflow-hidden bg-frost-200 sm:grid-cols-2")}>
        {details.map((item) => (
          <div key={item.label} className="bg-white p-4">
            <dt className="caption flex items-center gap-2 text-ink-400">
              <item.Icon aria-hidden="true" className="size-3.5 text-ice-600" />
              {item.label}
            </dt>
            <dd className="mt-2 text-sm font-medium wrap-break-word text-ink-950">{item.value}</dd>
          </div>
        ))}
      </dl>

    </section>
  );
}

export function Faqs({ section, faqs }: { section: PageSection; faqs: Faq[] }) {
  return (
    <section aria-labelledby="faqs-title">
      <SectionHeading section={section} />
      <div className="divide-y divide-frost-200 border-y border-frost-200">
        {faqs.map((faq) => (
          <details key={faq.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-3.5 text-sm font-medium text-navy-950 [&::-webkit-details-marker]:hidden">
              {faq.question}
              <span
                aria-hidden="true"
                className="relative size-3.5 shrink-0 before:absolute before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-navy-900 after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-navy-900 after:transition-transform group-open:after:rotate-90"
              />
            </summary>
            <p className="pb-4 text-sm leading-6 text-ink-600">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Lanes the business runs often (beta). Each card starts a quote with the route filled in. */
export function Routes({ section, routes }: { section: PageSection; routes: RouteInfo[] }) {
  return (
    <section aria-labelledby="routes-title">
      <SectionHeading section={section} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {routes.map((route) => (
          <li
            key={`${route.originCity}-${route.destinationCity}-${route.originState}-${route.destinationState}`}
            className={cn(card, "flex flex-col p-4 transition-shadow hover:shadow-md")}
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-navy-950">{route.originCity}</p>
                <p className="truncate text-xs text-ink-500">{route.originState}</p>
              </div>
              <div aria-hidden="true" className="relative h-px min-w-8 flex-1 border-t border-dashed border-frost-400">
                <Truck className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 bg-white px-0.5 text-ice-600" />
              </div>
              <span className="sr-only">to</span>
              <div className="min-w-0 text-right">
                <p className="truncate text-base font-semibold text-navy-950">{route.destinationCity}</p>
                <p className="truncate text-xs text-ink-500">{route.destinationState}</p>
              </div>
            </div>
            {route.transitTime || route.frequency ? (
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
                {route.transitTime ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Timer aria-hidden="true" className="size-3.5 text-ice-600" />
                    {route.transitTime}
                  </span>
                ) : null}
                {route.frequency ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock aria-hidden="true" className="size-3.5 text-ice-600" />
                    {route.frequency}
                  </span>
                ) : null}
              </p>
            ) : null}
            <div className="mt-auto pt-3">
              <RouteButton
                route={{
                  originState: route.originState,
                  originCity: route.originCity,
                  destinationState: route.destinationState,
                  destinationCity: route.destinationCity,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
