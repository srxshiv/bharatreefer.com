"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";

/**
 * A link that prefetches its whole page, data included, as soon as the pointer, a finger or
 * the keyboard reaches it, so the click usually finds the page ready. Until then it only
 * prefetches the page's shell, like any link. Used where many links share a screen (rows,
 * cards, filters), since prefetching all of them up front would cost a server render each.
 */
export function IntentLink({ onMouseEnter, onFocus, onTouchStart, ...props }: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? true : "auto"}
      onMouseEnter={(event) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
    />
  );
}
