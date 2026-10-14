"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/cn";

/**
 * A thin bar under a link while the page it opens is loading, so a click always gets
 * immediate feedback even when the server takes a moment. Place inside a `<Link>`.
 */
export function PendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-2 bottom-0.5 h-0.5 origin-left rounded-full bg-ice-500 transition-[opacity,transform] duration-300",
        pending ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
        className,
      )}
    />
  );
}
