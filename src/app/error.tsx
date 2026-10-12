"use client";

import { useEffect } from "react";
import { useBusiness } from "@/components/site/site-context";
import { formatIndianMobile } from "@/lib/phone";

export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const business = useBusiness();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col justify-center bg-frost-50 text-ink-900">
      <div className="shell py-16">
        <p className="caption text-ink-400">Something went wrong</p>
        <h1 className="mt-4 max-w-xl text-4xl/tight font-semibold tracking-tight text-navy-950">
          We could not load this page.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-ink-500">
          Try again in a moment. If you need a truck now, call dispatch and we will take the
          details over the phone.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-12 items-center rounded-lg bg-navy-900 px-5 text-[15px] font-medium text-white transition-colors hover:bg-navy-800"
          >
            Try again
          </button>
          <a
            href={`tel:${business.phone}`}
            className="inline-flex h-12 items-center rounded-lg border border-frost-300 bg-white px-5 font-mono text-[15px] text-navy-900 transition-colors hover:border-ice-500"
          >
            Call {formatIndianMobile(business.phone)}
          </a>
        </div>
      </div>
    </main>
  );
}
