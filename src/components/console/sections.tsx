import {
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Clock,
  Handshake,
  Mail,
  MapPin,
  MessageCircle,
  Network,
  PackageCheck,
  Phone,
  Route,
  ShieldCheck,
  Telescope,
  Timer,
  Truck,
} from "lucide-react";
import { ABOUT } from "@/config/about";
import { BAND_STYLES } from "@/components/band-styles";
import { largestTruckKg, type FleetConfig } from "@/config/fleet";
import { MATERIAL_IDS, type MaterialId, type TemperatureBandInfo } from "@/config/materials";
import type { BusinessInfo } from "@/config/site";
import type { PageSection } from "@/features/content/sections";
import type { Faq, FleetPhotoInfo, RouteInfo, SiteCopy } from "@/features/content/types";
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

/**
 * A section's heading, as set in the admin panel: the label is the large heading, the title
 * the line under it, then the introduction. Empty text is left out; a section with no label
 * uses its title as the heading.
 */
function SectionHeading({ section }: { section: PageSection }) {
  const heading = section.eyebrow || section.title;
  const subheading = section.eyebrow ? section.title : null;
  return (
    <div className="mb-6">
      <h2 id={`${section.id}-title`} className="text-[2.25rem]/[1.1] font-semibold tracking-tight text-ink-950 lg:text-[2.75rem]/[1.08]">
        {heading}
      </h2>
      {subheading ? <p className="mt-2.5 text-lg/7 font-medium text-ink-700">{subheading}</p> : null}
      {section.intro ? <p className="mt-2 max-w-prose text-[15px] leading-7 text-ink-600">{section.intro}</p> : null}
    </div>
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
              <p className="text-base font-semibold text-ink-950">{band.label}</p>
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

/** Full load or part load: the two ways a consignment travels. Photos of the trucks follow, if any. */
export function Fleet({
  section,
  fleet,
  photos,
}: {
  section: PageSection;
  fleet: FleetConfig;
  photos: FleetPhotoInfo[];
}) {
  const largest = largestTruckKg(fleet);

  return (
    <section aria-labelledby="fleet-title">
      <SectionHeading section={section} />

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className={cn(card, "p-5")}>
          <dt className="text-base font-semibold text-ink-950">Full load</dt>
          <dd className="mt-1.5 text-sm leading-6 text-ink-600">
            A dedicated truck sized to your consignment. Loads heavier than {tonnes(largest)} are split across more than one truck.
          </dd>
        </div>
        <div className={cn(card, "p-5")}>
          <dt className="text-base font-semibold text-ink-950">Part load</dt>
          <dd className="mt-1.5 text-sm leading-6 text-ink-600">
            Smaller consignments share a truck with other cargo in the same temperature band heading the same way.
          </dd>
        </div>
      </dl>

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

/** One picture per step, in order; more steps than pictures reuse the last. */
const STEP_ICONS = [ClipboardList, Handshake, Truck, MapPin, PackageCheck, CircleCheck];

/**
 * How it works as a timeline: each step on a line from request to delivery, with when it
 * happens, so a customer sees at a glance what comes next and when.
 */
export function Steps({ section, copy }: { section: PageSection; copy: SiteCopy }) {
  return (
    <section aria-labelledby="steps-title">
      <SectionHeading section={section} />
      <ol className="relative">
        {copy.steps.map((step, index) => {
          const Icon = STEP_ICONS[Math.min(index, STEP_ICONS.length - 1)];
          const last = index === copy.steps.length - 1;
          return (
            <li key={step.title} className={cn("relative grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-x-5", !last && "pb-5")}>
              {/* The line joining the steps, from this icon to the next. */}
              {last ? null : (
                <span aria-hidden="true" className="absolute top-12 bottom-0 left-6 w-0.5 -translate-x-1/2 rounded-full bg-linear-to-b from-ice-400 to-frost-300 sm:top-14 sm:left-7" />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 grid size-12 place-items-center rounded-2xl text-white shadow-[0_10px_24px_-12px_rgb(1_39_84/0.6)] sm:size-14",
                  last ? "bg-success" : "bg-navy-900",
                )}
              >
                <Icon className="size-5.5 sm:size-6" strokeWidth={1.75} />
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-surface font-mono text-[0.625rem] font-semibold text-ink-950 ring-1 ring-frost-300">
                  {index + 1}
                </span>
              </span>
              <div className={cn(card, "p-4 sm:p-5")}>
                {step.when ? (
                  <p className="inline-flex items-center rounded-full bg-ice-50 px-2.5 py-0.5 text-xs font-semibold text-ice-700">{step.when}</p>
                ) : null}
                <p className={cn("text-lg/7 font-semibold text-ink-950", step.when && "mt-2")}>{step.title}</p>
                <p className="mt-1 text-[15px] leading-6 text-ink-600">{step.body}</p>
              </div>
            </li>
          );
        })}
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
          <div key={item.label} className="bg-surface p-4">
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

const MISSION_ICONS = [Route, ShieldCheck, Network, Handshake];

/** Who the business is: its story, vision, mission, the businesses it serves and why it does this. */
export function About({ section }: { section: PageSection }) {
  const { story, vision, mission, served, why, belief } = ABOUT;
  const subheading = "text-lg font-semibold text-ink-950";

  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-24 lg:scroll-mt-28">
      <SectionHeading section={section} />

      <div className="max-w-prose space-y-3 text-[15px] leading-7 text-ink-600">
        {story.map((paragraph, index) => (
          <p key={paragraph} className={cn(index === 1 && "font-semibold text-ink-950")}>
            {paragraph}
          </p>
        ))}
      </div>

      <div className={cn(card, "mt-6 flex gap-4 p-5")}>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ice-50 text-ice-600">
          <Telescope aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h3 className={subheading}>{vision.title}</h3>
          <p className="mt-1.5 text-[15px] leading-7 font-medium text-ink-950">{vision.lead}</p>
          <p className="mt-2 text-sm leading-6 text-ink-600">{vision.body}</p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className={subheading}>{mission.title}</h3>
        <p className="mt-1.5 text-[15px] leading-7 text-ink-600">{mission.lead}</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {mission.points.map((point, index) => {
            const Icon = MISSION_ICONS[index % MISSION_ICONS.length];
            return (
              <li key={point.title} className={cn(card, "p-5")}>
                <Icon aria-hidden="true" className="size-5 text-ice-600" />
                <p className="mt-3 text-base font-semibold text-ink-950">{point.title}</p>
                <p className="mt-1.5 text-sm leading-6 text-ink-600">{point.body}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8">
        <h3 className={subheading}>{served.title}</h3>
        <p className="mt-1.5 text-[15px] leading-7 text-ink-600">{served.lead}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {served.list.map((item) => (
            <li key={item} className="rounded-lg border border-frost-200 bg-surface px-3 py-1.5 text-sm text-ink-900">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-6 text-ink-600">{served.closing}</p>
      </div>

      <div className="mt-8">
        <h3 className={subheading}>{why.title}</h3>
        <div className="mt-1.5 max-w-prose space-y-3 text-[15px] leading-7 text-ink-600">
          {why.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <figure className="mt-8 overflow-hidden rounded-2xl bg-navy-950 text-white">
        <div aria-hidden="true" className="tricolour h-1" />
        <div className="p-6 sm:p-8">
          <p className="caption text-ice-200/80">{belief.title}</p>
          <blockquote className="mt-3 space-y-1 text-xl/snug font-semibold tracking-tight sm:text-2xl/snug">
            {belief.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </blockquote>
          <figcaption className="mt-5 text-sm font-medium text-ice-200">{belief.signature}</figcaption>
        </div>
      </figure>
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
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-3.5 text-sm font-medium text-ink-950 [&::-webkit-details-marker]:hidden">
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
                <p className="truncate text-base font-semibold text-ink-950">{route.originCity}</p>
                <p className="truncate text-xs text-ink-500">{route.originState}</p>
              </div>
              <div aria-hidden="true" className="relative h-px min-w-8 flex-1 border-t border-dashed border-frost-400">
                <Truck className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 bg-surface px-0.5 text-ice-600" />
              </div>
              <span className="sr-only">to</span>
              <div className="min-w-0 text-right">
                <p className="truncate text-base font-semibold text-ink-950">{route.destinationCity}</p>
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
