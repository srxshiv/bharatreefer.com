import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { getSiteContent } from "@/features/content/data";
import { formatIndianMobile } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Page not found",
};

export default async function NotFound() {
  const { business } = await getSiteContent();

  return (
    <main className="flex flex-1 flex-col bg-frost-50 text-ink-900">
      <div className="shell flex h-16 items-center">
        <Link href="/" aria-label={`${business.name} home`} className="rounded-lg">
          <Logo name={business.name} />
        </Link>
      </div>
      <div className="shell flex flex-1 flex-col justify-center py-16">
        <p className="caption text-ink-400">Error 404</p>
        <h1 className="mt-4 max-w-xl text-4xl/tight font-semibold tracking-tight text-ink-950">
          This page is not on our route.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-ink-500">
          The link may be old or mistyped. Head back to the home page to request a quote.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-lg bg-navy-900 px-5 text-[15px] font-medium text-white transition-colors hover:bg-navy-800"
          >
            Back to home
          </Link>
          <a
            href={`tel:${business.phone}`}
            className="inline-flex h-12 items-center rounded-lg border border-frost-300 bg-surface px-5 font-mono text-[15px] text-ink-950 transition-colors hover:border-ice-500"
          >
            Call {formatIndianMobile(business.phone)}
          </a>
        </div>
      </div>
    </main>
  );
}
