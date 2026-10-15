"use client";

import { createContext, use, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { startNavigationProgress } from "../navigation-progress";

const FilterPending = createContext(false);

/**
 * Holds the filter form and the results together. While new results load, the current ones
 * stay on screen, dimmed, so the page never blanks or jumps.
 */
const Navigate = createContext<(href: string) => void>(() => {});

export function FilterScope({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (href: string) => {
    startNavigationProgress();
    startTransition(() => router.push(href, { scroll: false }));
  };
  return (
    <Navigate value={navigate}>
      <FilterPending value={pending}>{children}</FilterPending>
    </Navigate>
  );
}

/** The results under the filters: dimmed, with a small spinner, while the next ones load. */
export function FilterResults({ children, className }: { children: ReactNode; className?: string }) {
  const pending = use(FilterPending);
  return (
    <div aria-busy={pending || undefined} className="relative">
      <div className={cn("transition-opacity duration-150", className, pending && "pointer-events-none opacity-55")}>{children}</div>
      {pending ? (
        <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 shadow-md ring-1 ring-frost-200">
            <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin text-ice-600" />
            Updating
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The search and filter form above the requests. Builds a tidy address from the fields that
 * have a value (`?material=frozen`, not a row of empty parameters). The temperature dropdown
 * applies as soon as it changes, the search box on Enter, the filter panel on Apply. Without
 * JavaScript it is an ordinary GET form.
 */
export function FilterForm({ action, className, children }: { action: string; className?: string; children: ReactNode }) {
  const navigate = use(Navigate);
  function apply(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [name, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim() !== "") params.append(name, value.trim());
    }
    const query = params.toString();
    const target = `${action}${query ? `?${query}` : ""}`;
    if (target === `${location.pathname}${location.search}`) return;
    navigate(target);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply(event.currentTarget);
  }

  return (
    <form
      action={action}
      method="get"
      onSubmit={handleSubmit}
      onChange={(event) => {
        // Only fields marked data-apply (the temperature dropdown) apply on their own; the
        // panel's fields wait for its Apply button so several can be set together.
        const field = event.target;
        if (field instanceof HTMLSelectElement && field.dataset.apply !== undefined) apply(event.currentTarget);
      }}
      className={className}
    >
      {children}
    </form>
  );
}
