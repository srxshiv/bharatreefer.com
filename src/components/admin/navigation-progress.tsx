"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const START_EVENT = "admin:navigation-start";

/** Shows the bar for a navigation that does not start from a link click, such as the filter form. */
export function startNavigationProgress() {
  window.dispatchEvent(new Event(START_EVENT));
}

/** Gives up waiting after this long, so a navigation that never completes cannot leave the bar stuck. */
const GIVE_UP_MS = 8_000;

/**
 * A thin bar across the top of the admin panel from the moment a link or filter is used
 * until the new page is on screen. Admin pages render complete on the server, so this is
 * the feedback in between.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams.toString()}`;
  const [pending, setPending] = useState(false);
  const [settledUrl, setSettledUrl] = useState(url);

  // The URL changed: the navigation finished.
  if (url !== settledUrl) {
    setSettledUrl(url);
    setPending(false);
  }

  useEffect(() => {
    const here = () => `${location.pathname}${location.search}`;

    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const target = new URL(link.href, location.href);
      if (target.origin !== location.origin || !target.pathname.startsWith("/admin")) return;
      if (target.pathname.startsWith("/admin/export")) return;
      if (`${target.pathname}${target.search}` === here()) return;
      setPending(true);
    }

    const onStart = () => setPending(true);
    document.addEventListener("click", onClick);
    window.addEventListener(START_EVENT, onStart);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(START_EVENT, onStart);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPending(false), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  return (
    <div
      aria-hidden="true"
      data-pending={pending ? "true" : undefined}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-ice-500 shadow-[0_0_8px_var(--color-ice-400)]",
        pending ? "animate-[nav-progress_2.5s_cubic-bezier(0.1,0.7,0.2,1)_forwards] opacity-100" : "scale-x-0 opacity-0 transition-opacity",
      )}
    />
  );
}
