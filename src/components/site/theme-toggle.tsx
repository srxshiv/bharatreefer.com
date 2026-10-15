"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { THEME_COLORS, THEME_KEY } from "./theme";

/**
 * Switches between the dark and light themes and remembers the choice in this browser. The
 * icon and label follow the theme through CSS, so the button renders the same on the server
 * and needs no state.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private browsing can refuse storage; the switch still applies to this page.
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[next]);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-frost-100 hover:text-ink-950",
        className,
      )}
    >
      <Sun aria-hidden="true" className="hidden size-4.5 dark:block" />
      <Moon aria-hidden="true" className="size-4.5 dark:hidden" />
      <span className="sr-only dark:hidden">Switch to the dark theme</span>
      <span className="sr-only hidden dark:block">Switch to the light theme</span>
    </button>
  );
}
