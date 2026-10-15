"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Away for longer than this, and the page reloads its data on return. */
const AWAY_MS = 30_000;

/**
 * Admin pages are kept in the browser for quick switching. When the admin comes back to the
 * tab after a while, this fetches the current page again, so new requests show up without a
 * reload.
 */
export function RefreshWhenVisible() {
  const router = useRouter();
  useEffect(() => {
    let hiddenAt = 0;
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) {
        hiddenAt = 0;
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);
  return null;
}
