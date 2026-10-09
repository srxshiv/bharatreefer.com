"use client";

import { useEffect } from "react";
import { site } from "@/config/site";

export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="reefer-wall flex flex-1 flex-col justify-center text-white">
      <div className="shell py-16">
        <p className="caption text-ice-400">Something went wrong</p>
        <h1 className="mt-4 max-w-xl text-4xl/[1.05] font-extrabold tracking-tight sm:text-5xl/[1.05]">
          We could not load this page.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-ink-300">
          Try again in a moment. If you need a truck now, call dispatch and we will take the
          details over the phone.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-12 items-center rounded-lg bg-white px-5 text-base font-semibold text-ink-950 transition-colors hover:bg-frost-100"
          >
            Try again
          </button>
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
