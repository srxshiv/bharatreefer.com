"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A modal panel: slides in from the right on wider screens and up from the bottom on
 * phones. Escape, the close button and a click outside all close it.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  status,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Result of the last action, shown along the bottom. The page behind is dimmed, so it goes here. */
  status?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    dialog.showModal();
    // Closing on cleanup matters: Next.js keeps a page mounted but hidden after navigating
    // away, and a modal left open would make the next page unclickable.
    return () => dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none flex-col overflow-hidden rounded-t-2xl bg-white p-0 text-ink-900 shadow-2xl open:flex",
        "sm:inset-y-0 sm:right-0 sm:left-auto sm:h-dvh sm:max-h-dvh sm:w-[32rem] sm:rounded-none sm:rounded-l-2xl",
        "backdrop:bg-ink-950/40",
        "transition-[translate] duration-300 ease-out starting:open:translate-y-full sm:starting:open:translate-x-full sm:starting:open:translate-y-0",
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-frost-200 px-5 py-4">
        <div id={titleId} className="min-w-0">
          {title}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-frost-100 hover:text-ink-950"
        >
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Close</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
      <div aria-live="polite" className="empty:hidden border-t border-frost-200 px-5 py-3">
        {status}
      </div>
    </dialog>
  );
}
