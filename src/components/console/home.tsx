import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import type { PageSection, SectionId } from "@/features/content/sections";
import type { SiteContent } from "@/features/content/types";
import { GENERAL_WHATSAPP_MESSAGE } from "@/features/quotes/messages";
import { cn } from "@/lib/cn";
import { formatIndianMobile } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { DeskStatus } from "./desk-status";
import { Intro, IntroBackdrop } from "./intro";
import { QuoteCard } from "./quote-card";
import { About, Bands, Contact, Faqs, Fleet, Routes, Steps, formatAddress } from "./sections";
import { primaryButton } from "./ui";

/**
 * The public site: the opening scene, then the sections in one column and the quote card in
 * the other. On large screens the card stays in view while the column scrolls; on phones it
 * comes first, right after the scene.
 */
export function Home({ content }: { content: SiteContent }) {
  const { business, fleet, bands, copy, photos, routes, sections, announcement } = content;
  const phoneDisplay = formatIndianMobile(business.phone);

  // Each section the business has switched on, in their order. A section with nothing to
  // show (no routes yet, no questions) is left out rather than shown empty.
  const render: Record<SectionId, (section: PageSection) => ReactNode> = {
    bands: (section) => <Bands section={section} bands={bands} />,
    fleet: (section) => <Fleet section={section} fleet={fleet} photos={photos} />,
    routes: (section) => (routes.length > 0 ? <Routes section={section} routes={routes} /> : null),
    steps: (section) => (copy.steps.length > 0 ? <Steps section={section} copy={copy} /> : null),
    about: (section) => <About section={section} />,
    contact: (section) => <Contact section={section} business={business} />,
    faqs: (section) => (copy.faqs.length > 0 ? <Faqs section={section} faqs={copy.faqs} /> : null),
  };
  const shown = sections
    .filter((section) => section.visible)
    .map((section) => ({ id: section.id, node: render[section.id](section) }))
    .filter((item) => item.node !== null);

  return (
    <div className="flex min-h-dvh flex-col">
      <IntroBackdrop business={business} />
      {announcement ? <AnnouncementBar announcement={announcement} /> : null}
      {/* A navy band along the top in the logo's colour. */}
      {/* Dark while it is over the opening scene (IntroMotion switches it), light after. */}
      <header
        data-site-header=""
        data-theme="dark"
        className="sticky top-0 z-30 border-t-[3px] border-b border-t-navy-900 border-b-frost-200 bg-surface/80 backdrop-blur-xl backdrop-saturate-150 transition-colors duration-500"
      >
        <div className="shell flex h-16 items-center justify-between gap-4 lg:h-20">
          <Link href="/" className="rounded-lg">
            <Logo name={business.name} priority />
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <DeskStatus hours={business.hours} className="hidden text-sm md:inline-flex" />
            <a
              href={`tel:${business.phone}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-2.5 font-mono text-sm text-ink-950 transition-colors hover:bg-frost-100"
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
            <ThemeToggle />
            <a href="#quote" className={cn(primaryButton, "h-10 px-4 text-sm lg:hidden")}>
              Get a quote
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>
      </header>

      <Intro business={business} showStory={shown.some((item) => item.id === "about")} />

      {/* Frosted glass that slides up over the photo: the truck stays softly behind the page.
          The blur is the photo's own blurred copy (IntroBackdrop), not a backdrop filter: Safari
          drops backdrop filters on an element as tall as the page, showing the sharp photo.
          It overlaps the scene by its corner radius, so the corners show the scene's dark edge
          rather than the lighter photo below it. */}
      <main className="frost-glow relative -mt-8 flex-1 rounded-t-[2rem] bg-frost-50/80 shadow-[0_-30px_80px_-30px_rgb(0_0_0/0.45)]">
        {/* The page's heading, for search engines and screen readers: the scene says it in pictures. */}
        <h1 className="sr-only">{copy.heroHeading}</h1>
        <div className="shell grid grid-cols-1 gap-x-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:pt-12 lg:pb-10 xl:gap-x-14">
          {/* Pinned while the sections scroll. Sized to fit a laptop screen whole, nothing to scroll. */}
          <div className="lg:col-start-2 lg:row-start-1 lg:self-start lg:sticky lg:top-26">
            {/* Never taller than the window: on a short screen the form scrolls inside the card. */}
            <QuoteCard business={business} fleet={fleet} bands={bands} className="lg:max-h-[calc(100dvh-7.5rem)]" />
          </div>

          {shown.length > 0 ? (
            <div className="mt-14 space-y-16 lg:col-start-1 lg:row-start-1 lg:mt-0">
              {shown.map((item) => (
                <div key={item.id}>{item.node}</div>
              ))}
            </div>
          ) : null}
        </div>
      </main>

      <footer className="bg-navy-950 text-ice-200/80">
        <div aria-hidden="true" className="tricolour h-0.5 opacity-90" />
        <div className="shell flex flex-col gap-2 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            {business.name} · {formatAddress(business.address)} · {business.email}
          </p>
          <p>© {business.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
