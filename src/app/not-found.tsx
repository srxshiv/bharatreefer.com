import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="reefer-wall flex flex-1 flex-col text-white">
      <div className="shell flex h-16 items-center">
        <Link href="/" aria-label={`${site.name} home`} className="rounded-md">
          <Logo />
        </Link>
      </div>
      <div className="shell flex flex-1 flex-col justify-center py-16">
        <p className="caption text-ice-400">Error 404</p>
        <h1 className="mt-4 max-w-xl text-4xl/[1.05] font-extrabold tracking-tight sm:text-5xl/[1.05]">
          This page is not on our route.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-ink-300">
          The link may be old or mistyped. Head back to the home page to request a quote.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-lg bg-white px-5 text-base font-semibold text-ink-950 transition-colors hover:bg-frost-100"
          >
            Back to home
          </Link>
          <a
            href={`tel:${site.phone.e164}`}
            className="inline-flex h-12 items-center rounded-lg border border-white/25 px-5 font-mono text-base font-medium text-white transition-colors hover:bg-white/10"
          >
            Call {site.phone.display}
          </a>
        </div>
      </div>
    </main>
  );
}
