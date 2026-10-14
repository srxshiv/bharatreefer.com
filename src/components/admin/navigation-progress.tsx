"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

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

    // Only search forms that navigate (next/form, with an admin page as their action).
    // Settings forms submit by hand and stay on the page.
    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() !== "get") return;
      const action = form.getAttribute("action");
      if (!action?.startsWith("/admin")) return;
      const query = new URLSearchParams(
        [...new FormData(form).entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      ).toString();
      if (`${action}${query ? `?${query}` : ""}` === here()) return;
      setPending(true);
    }

    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
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
