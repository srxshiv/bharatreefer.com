"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert, RotateCw } from "lucide-react";
import { primaryButton, secondaryButton } from "@/components/admin/ui";

/**
 * Shown inside the admin panel, under its menu, when a page fails on the server. "Try again"
 * renders the page again; when the error repeats, a full reload or another page is the way
 * out, so both are offered. The reference matches the error in the server logs (on Vercel:
 * the project's Logs tab), where the full message is.
 */
export default function AdminError({
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
    <div className="max-w-xl py-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-danger">
        <CircleAlert aria-hidden="true" className="size-4" />
        Something went wrong
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-950">This page could not load.</h1>
      <p className="mt-2 text-ink-600">
        The server hit an error while preparing it. Try again, or reload the page. If it keeps happening, the
        reference below finds the full error in the server logs.
      </p>
      {process.env.NODE_ENV !== "production" ? (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-frost-100 p-3 text-xs whitespace-pre-wrap text-ink-700">{error.message}</pre>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => retry()} className={primaryButton}>
          <RotateCw aria-hidden="true" className="size-4" />
          Try again
        </button>
        <button type="button" onClick={() => window.location.reload()} className={secondaryButton}>
          Reload page
        </button>
        <Link href="/admin" className={secondaryButton}>
          Go to requests
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-6 text-sm text-ink-500">
          Reference <code className="rounded bg-frost-100 px-1.5 py-0.5 font-mono text-ink-700">{error.digest}</code>
        </p>
      ) : null}
    </div>
  );
}
