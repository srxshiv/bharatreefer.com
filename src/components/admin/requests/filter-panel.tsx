"use client";

import { useId, useRef, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { IntentLink } from "../intent-link";

/**
 * The less used filters (dates, states, load type, price, sorting) in a panel that opens from
 * a "Filters" button, so they take no room until needed. Set any number of them, then Apply.
 * The panel sits inside the filter form, so its fields are submitted with the rest.
 */
export function FilterPanel({ activeCount, resetHref, children }: { activeCount: number; resetHref: string; children: ReactNode }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const element = panel.current;
          if (!element) return;
          const width = Math.min(704, window.innerWidth - 16);
          element.style.width = `${width}px`;
          element.style.top = `${rect.bottom + 6}px`;
          element.style.left = `${Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8)}px`;
        }}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
          activeCount > 0 ? "border-ice-500 bg-ice-50 text-ice-700" : "border-frost-300 bg-surface text-ink-700 hover:border-ink-400",
        )}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filters
        {activeCount > 0 ? (
          <span className="rounded-full bg-navy-900 px-1.5 font-mono text-xs text-white">{activeCount}</span>
        ) : null}
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        className="fixed m-0 max-h-[80dvh] overflow-y-auto rounded-xl border border-frost-200 bg-surface p-4 text-ink-900 shadow-2xl"
      >
        {children}
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-frost-200 pt-3">
          {activeCount > 0 ? (
            <IntentLink href={resetHref} className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-ink-500 hover:text-ink-950">
              Reset these
            </IntentLink>
          ) : null}
          <button type="submit" className="inline-flex h-9 items-center rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800">
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
