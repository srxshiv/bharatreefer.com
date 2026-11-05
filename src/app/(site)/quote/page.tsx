import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { QuoteCard } from "@/components/console/quote-card";
import { formatAddress } from "@/components/console/sections";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { getSiteContent } from "@/features/content/data";
import { GENERAL_WHATSAPP_MESSAGE } from "@/features/quotes/messages";
import { formatIndianMobile } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const { business } = await getSiteContent();
  const description = `Send the route, the temperature and the weight. ${business.name} dispatch replies within ${business.responseTime}.`;
  return {
    title: "Get a quote",
    description,
    alternates: { canonical: "/quote" },
    openGraph: {
      type: "website",
      siteName: business.name,
      locale: "en_IN",
      url: "/quote",
      title: `Get a quote | ${business.name}`,
      description,
    },
  };
}

/**
 * The quote form on its own, for links in messages, ads and visiting cards: nothing to scroll
 * past on a phone. A team member's code works here too (/quote?code=PRIYA).
 */
export default async function QuotePage() {
  const { business, fleet, bands } = await getSiteContent();

  return (
    <div className="frost-glow flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <header className="border-t-[3px] border-t-navy-900 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 w-full max-w-xl items-center justify-between gap-3 px-3 sm:px-4">
          <Link href="/" className="rounded-lg" aria-label={`${business.name} home`}>
            <Logo name={business.name} priority />
          </Link>
          <div className="flex items-center gap-1">
            <a
              href={`tel:${business.phone}`}
              aria-label={`Call ${formatIndianMobile(business.phone)}`}
              className="inline-flex size-11 items-center justify-center rounded-lg text-ice-600 transition-colors hover:bg-frost-100"
            >
              <Phone aria-hidden="true" className="size-5" />
            </a>
            {business.whatsapp ? (
              <a
                href={whatsappLink(business.whatsapp, GENERAL_WHATSAPP_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Message us on WhatsApp"
                className="inline-flex size-11 items-center justify-center rounded-lg text-ice-600 transition-colors hover:bg-frost-100"
              >
                <MessageCircle aria-hidden="true" className="size-5" />
              </a>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-3 pt-1 pb-6 sm:px-4 sm:pt-4 sm:pb-10">
        <QuoteCard business={business} fleet={fleet} bands={bands} />
      </main>

      <footer className="mx-auto w-full max-w-xl px-4 pb-5 text-center text-xs leading-5 text-ink-500">
        <p>
          {business.name} · {formatAddress(business.address)}
        </p>
        <p>
          Prefer to talk?{" "}
          <a href={`tel:${business.phone}`} className="font-medium text-ink-900 underline decoration-frost-400 underline-offset-4">
            Call {formatIndianMobile(business.phone)}
          </a>
        </p>
      </footer>
    </div>
  );
}
