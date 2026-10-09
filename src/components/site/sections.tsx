import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import { FLEET_CAPACITIES_KG, MAX_QUANTITY_KG, MIN_QUANTITY_KG } from "@/config/fleet";
import { MATERIAL_LIST } from "@/config/materials";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";
import { formatCapacity, formatKg } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";

const SMALLEST_KG = FLEET_CAPACITIES_KG[0];
const LARGEST_KG = FLEET_CAPACITIES_KG[FLEET_CAPACITIES_KG.length - 1];

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <p className="caption text-ice-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl/[1.1] font-bold tracking-tight text-ink-950 sm:text-4xl/[1.1]">
        {title}
      </h2>
      {children ? <p className="mt-4 text-lg leading-8 text-ink-500">{children}</p> : null}
    </div>
  );
}

export function TemperatureBands() {
  return (
    <section id="temperature" className="shell scroll-mt-20 py-16 sm:py-24">
      <SectionHeading eyebrow="Temperature bands" title="Set to what your cargo needs.">
        Tell us what you are moving and we send a truck set to the matching band.
      </SectionHeading>

      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {MATERIAL_LIST.map((band) => (
          <li
            key={band.id}
            className={cn(
              "rounded-xl border border-t-4 border-frost-200 bg-white p-6",
              BAND_STYLES[band.id].rule,
            )}
          >
            <h3 className="text-lg font-bold text-ink-950">{band.label}</h3>
            <p
              className={cn(
                "mt-2 font-mono text-2xl font-semibold tracking-tight",
                BAND_STYLES[band.id].text,
              )}
            >
              {band.range}
            </p>
            <p className="mt-4 leading-7 text-ink-500">{band.summary}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {band.examples.map((example) => (
                <li
                  key={example}
                  className="rounded-md bg-frost-100 px-2.5 py-1 text-sm text-ink-700"
                >
                  {example}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

const LOAD_TYPES = [
  {
    title: "Full load",
    body: `A dedicated truck sized to your consignment. Loads heavier than ${LARGEST_KG / 1000} tonnes are split across more than one truck.`,
  },
  {
    title: "Part load",
    body: "Smaller consignments share a truck with other cargo in the same temperature band heading the same way.",
  },
];

export function Fleet() {
  return (
    <section id="fleet" className="scroll-mt-20 border-y border-frost-200 bg-white">
      <div className="shell grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="Fleet"
            title={`${FLEET_CAPACITIES_KG.length} truck sizes, ${formatCapacity(SMALLEST_KG).replace(" ", "\u00a0")} to ${LARGEST_KG / 1000}\u00a0tonnes.`}
          >
            The quote form suggests the smallest truck that carries your weight. Dispatch confirms
            the vehicle when they quote.
          </SectionHeading>

          <dl className="mt-10 space-y-7">
            {LOAD_TYPES.map((type) => (
              <div key={type.title} className="border-l-2 border-ink-900 pl-5">
                <dt className="font-display text-lg font-bold text-ink-950">{type.title}</dt>
                <dd className="mt-1.5 leading-7 text-ink-500">{type.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="self-center">
          <figcaption className="caption text-ink-500">Payload per truck</figcaption>
          <ol className="mt-4 space-y-2">
            {FLEET_CAPACITIES_KG.map((capacityKg) => (
              <li key={capacityKg} className="grid grid-cols-[4.25rem_1fr] items-center gap-4">
                <span className="text-right font-mono text-sm font-semibold text-ink-950">
                  {formatCapacity(capacityKg)}
                </span>
                <span className="block h-7 rounded-md bg-frost-100">
                  <span
                    className="block h-full rounded-md bg-ink-900"
                    style={{ width: `${(capacityKg / LARGEST_KG) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ol>
        </figure>
      </div>
    </section>
  );
}

const QUESTIONS = [
  {
    question: "What is the smallest load you take?",
    answer: `Consignments from ${formatKg(MIN_QUANTITY_KG)}. Small loads travel as a part load, sharing a truck with other cargo in the same temperature band.`,
  },
  {
    question: "What if my load is heavier than one truck?",
    answer: `One request can cover up to ${formatKg(MAX_QUANTITY_KG)}. Anything over ${LARGEST_KG / 1000} tonnes is planned across more than one truck.`,
  },
  {
    question: "How soon will I hear back?",
    answer: `Within ${site.responseTime}. The dispatch desk is open ${site.hours.display}.`,
  },
  {
    question: "Can I change the details after sending a request?",
    answer: `Yes. Call dispatch on ${site.phone.display} with your reference number and we will update the request.`,
  },
];

export function Faq() {
  return (
    <section id="questions" className="scroll-mt-20">
      <div className="shell grid gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <SectionHeading eyebrow="Questions" title="Before you send a request." />

        <div className="divide-y divide-frost-200 border-y border-frost-200">
          {QUESTIONS.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-semibold text-ink-950 [&::-webkit-details-marker]:hidden">
                {item.question}
                <span
                  aria-hidden="true"
                  className="relative size-4 shrink-0 before:absolute before:inset-x-0 before:top-1/2 before:h-0.5 before:-translate-y-1/2 before:bg-ink-900 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-ink-900 after:transition-transform group-open:after:rotate-90"
                />
              </summary>
              <p className="max-w-2xl pb-6 leading-7 text-ink-500">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const channels = [
    {
      icon: Phone,
      label: "Phone",
      value: site.phone.display,
      href: `tel:${site.phone.e164}`,
    },
    {
      icon: Mail,
      label: "Email",
      value: site.email,
      href: `mailto:${site.email}`,
    },
    {
      icon: MapPin,
      label: "Dispatch office",
      value: `${site.address.street}, ${site.address.city}`,
    },
    {
      icon: Clock,
      label: "Desk hours",
      value: site.hours.display,
    },
  ];

  return (
    <section id="contact" className="reefer-wall scroll-mt-20 text-white">
      <div className="shell grid gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div>
          <p className="caption text-ice-400">Contact</p>
          <h2 className="mt-3 text-3xl/[1.1] font-bold tracking-tight sm:text-4xl/[1.1]">
            Talk to dispatch.
          </h2>
          <p className="mt-4 max-w-md text-lg leading-8 text-ink-300">
            Urgent load or an unusual route? Call the desk directly, or send the details and we
            will come back with a quote.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/#quote"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 text-base font-semibold text-ink-950 transition-colors hover:bg-frost-100"
            >
              Request a quote
              <ArrowRight aria-hidden="true" className="size-5" />
            </Link>
            {site.whatsapp ? (
              <a
                href={whatsappLink(site.whatsapp, "Hello, I would like a quote for a refrigerated load.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/25 px-5 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                <MessageCircle aria-hidden="true" className="size-5" />
                WhatsApp us
              </a>
            ) : null}
          </div>
        </div>

        <dl className="grid gap-px overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10 sm:grid-cols-2">
          {channels.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="bg-ink-950 p-6">
              <dt className="caption flex items-center gap-2 text-ink-400">
                <Icon aria-hidden="true" className="size-4 text-ice-400" />
                {label}
              </dt>
              <dd className="mt-3 text-base font-semibold break-words">
                {href ? (
                  <a
                    href={href}
                    className="rounded-sm underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-ice-400"
                  >
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
