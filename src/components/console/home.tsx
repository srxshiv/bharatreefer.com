import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { Logo } from "@/components/site/logo";
import type { PageSection, SectionId } from "@/features/content/sections";
import type { SiteContent } from "@/features/content/types";
import { GENERAL_WHATSAPP_MESSAGE } from "@/features/quotes/messages";
import { cn } from "@/lib/cn";
import { formatIndianMobile } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { DeskStatus } from "./desk-status";
import { QuoteCard } from "./quote-card";
import { Bands, Contact, Faqs, Fleet, Hero, Routes, Steps, formatAddress } from "./sections";
import { primaryButton } from "./ui";

/**
 * The public site: the brand and company information in one column, the quote card in
 * the other. On large screens the card stays in view while the column scrolls; on phones
 * it sits right under the introduction.
 */
export function Home({ content }: { content: SiteContent }) {
  const { business, fleet, trucks, bands, copy, photos, routes, sections, showFacts, announcement } = content;
  const phoneDisplay = formatIndianMobile(business.phone);

  // Each section the business has switched on, in their order. A section with nothing to
  // show (no routes yet, no questions) is left out rather than shown empty.
  const render: Record<SectionId, (section: PageSection) => ReactNode> = {
    bands: (section) => <Bands section={section} bands={bands} />,
    fleet: (section) => <Fleet section={section} trucks={trucks} fleet={fleet} photos={photos} />,
    routes: (section) => (routes.length > 0 ? <Routes section={section} routes={routes} /> : null),
    steps: (section) => (copy.steps.length > 0 ? <Steps section={section} copy={copy} /> : null),
    contact: (section) => <Contact section={section} business={business} />,
    faqs: (section) => (copy.faqs.length > 0 ? <Faqs section={section} faqs={copy.faqs} /> : null),
  };
  const shown = sections
    .filter((section) => section.visible)
    .map((section) => ({ id: section.id, node: render[section.id](section) }))
    .filter((item) => item.node !== null);

  return (
    <div className="flex min-h-dvh flex-col">
      {announcement ? <AnnouncementBar announcement={announcement} /> : null}
      <header className="sticky top-0 z-30 border-b border-frost-200 bg-white/90 backdrop-blur-sm">
        <div className="shell flex h-16 items-center justify-between gap-4 lg:h-20">
          <Link href="/" className="rounded-lg">
            <Logo name={business.name} priority />
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <DeskStatus hours={business.hours} className="hidden text-sm md:inline-flex" />
            <a
              href={`tel:${business.phone}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-2.5 font-mono text-sm text-navy-900 transition-colors hover:bg-frost-100"
            >
              <Phone aria-hidden="true" className="size-4 text-ice-600" />
              <span className="sr-only sm:not-sr-only">{phoneDisplay}</span>
            </a>
            {business.whatsapp ? (
              <a
                href={whatsappLink(business.whatsapp, GENERAL_WHATSAPP_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Message us on WhatsApp"
                className="inline-flex size-10 items-center justify-center rounded-lg text-ice-600 transition-colors hover:bg-frost-100"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
              </a>
            ) : null}
            <a href="#quote" className={cn(primaryButton, "h-10 px-4 text-sm lg:hidden")}>
              Get a quote
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="frost-glow flex-1">
        <div className="shell grid grid-cols-1 gap-x-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:pt-6 lg:pb-10 xl:gap-x-14">
          <div className="lg:col-start-1 lg:pt-4">
            <Hero business={business} copy={copy} fleet={fleet} bands={bands} showFacts={showFacts} />
          </div>

          {/* Pinned while the brand column scrolls. Sized to fit a laptop screen whole, nothing to scroll. */}
          <div className="mt-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start lg:sticky lg:top-26">
            <QuoteCard business={business} fleet={fleet} bands={bands} />
          </div>

          {shown.length > 0 ? (
            <div className="mt-14 space-y-14 lg:col-start-1 lg:row-start-2 lg:mt-16">
              {shown.map((item) => (
                <div key={item.id}>{item.node}</div>
              ))}
            </div>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-frost-200 bg-white">
        <div className="shell flex flex-col gap-2 py-5 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {business.name} · {formatAddress(business.address)} · {business.email}
          </p>
          <p>© {business.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
