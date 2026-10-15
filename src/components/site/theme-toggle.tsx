import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Switches between the dark and light themes and remembers the choice in this browser. The
 * click is handled by the theme script in the root layout (see THEME_SCRIPT), so the button
 * works before React has loaded. The icon and label follow the theme through CSS, so the
 * button renders the same on the server and needs no state.
 */
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      data-theme-toggle
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
