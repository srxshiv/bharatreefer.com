"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Expand } from "lucide-react";
import { Sheet } from "./sheet";

/**
 * A side panel that is a page of its own: it has its own address, opens over the page it
 * was opened from, and closing it (the X, Escape, a click outside, or the browser's Back)
 * returns to that page as it was.
 */
export function RouteSheet({ title, children }: { title: ReactNode; children: ReactNode }) {
  const router = useRouter();
  return (
    <Sheet
      open
      size="lg"
      onClose={() => router.back()}
      title={title}
      actions={
        // The panel's address is the full page's: loading it afresh shows the page itself.
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex size-10 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-frost-100 hover:text-ink-950"
        >
          <Expand aria-hidden="true" className="size-4.5" />
          <span className="sr-only">Open as a full page</span>
        </button>
      }
    >
      {children}
    </Sheet>
  );
}
