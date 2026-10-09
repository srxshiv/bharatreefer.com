import { Phone } from "lucide-react";
import { QuoteForm } from "@/components/quote/quote-form";
import { FLEET_CAPACITIES_KG, MAX_QUANTITY_KG, MIN_QUANTITY_KG } from "@/config/fleet";
import { site } from "@/config/site";
import { formatCapacity } from "@/lib/format";

const SMALLEST_KG = FLEET_CAPACITIES_KG[0];
const LARGEST_KG = FLEET_CAPACITIES_KG[FLEET_CAPACITIES_KG.length - 1];

const FACTS = [
  {
    value: `${formatCapacity(SMALLEST_KG)} – ${formatCapacity(LARGEST_KG)}`,
    label: "Truck sizes",
  },
  {
    value: `${formatCapacity(MIN_QUANTITY_KG)} – ${formatCapacity(MAX_QUANTITY_KG)}`,
    label: "Per request",
  },
  {
    value: site.responseTime,
    label: "Quote turnaround",
  },
];

const STEPS = [
  {
    title: "Send the load details",
    body: "Route, temperature band and weight. The form takes about a minute.",
  },
  {
    title: "Get your quote",
    body: `Dispatch checks the route and the vehicle, then calls or emails you within ${site.responseTime}.`,
  },
  {
    title: "We load and move",
    body: "Confirm the quote and the truck reports to your loading point, set to your temperature band.",
  },
];

export function Hero() {
  return (
    <section className="reefer-wall text-white">
      <div className="shell grid gap-x-14 gap-y-9 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:grid-rows-[auto_1fr] lg:py-20">
        <div className="lg:pt-4">
          <p className="caption text-ice-400">{site.tagline}</p>
          <h1 className="mt-4 text-[2.5rem]/[1.04] font-extrabold tracking-tight sm:text-5xl/[1.04] xl:text-6xl/[1.02]">
            Reefer trucks from {formatCapacity(SMALLEST_KG).replace(" ", "\u00a0")} to{" "}
            {LARGEST_KG / 1000}&nbsp;tonnes.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink-300 sm:text-lg sm:leading-8">
            Frozen, chilled and normal-temperature cargo, as a full truck or a part load. Send the
            route and the weight, and dispatch replies with a quote within {site.responseTime}.
          </p>
        </div>

        <div id="quote" className="scroll-mt-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <QuoteForm />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <dl className="grid border-t border-white/15 sm:grid-cols-3 sm:gap-4 sm:pt-6">
            {FACTS.map((fact) => (
              <div
                key={fact.label}
                className="flex items-baseline justify-between gap-4 border-b border-white/10 py-3 sm:flex-col-reverse sm:justify-start sm:gap-1.5 sm:border-b-0 sm:py-0"
              >
                <dt className="caption text-ink-400">{fact.label}</dt>
                <dd className="font-mono text-base font-semibold whitespace-nowrap text-white sm:text-lg">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <h2 className="caption mt-10 text-ice-400">How it works</h2>
          <ol className="mt-4 space-y-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[2.25rem_1fr] gap-x-3">
                <span aria-hidden="true" className="pt-0.5 font-mono text-sm font-semibold text-ice-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-sans text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 max-w-md text-sm leading-6 text-ink-300">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-10 border-t border-white/15 pt-6 text-sm text-ink-300">
            Prefer to talk it through?{" "}
            <a
              href={`tel:${site.phone.e164}`}
              className="inline-flex items-center gap-1.5 rounded-sm font-semibold whitespace-nowrap text-white underline decoration-ice-400 decoration-2 underline-offset-4 hover:text-ice-300"
            >
              <Phone aria-hidden="true" className="size-4 text-ice-400" />
              Call {site.phone.display}
            </a>
            <span className="mt-1 block text-ink-400">{site.hours.display}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
