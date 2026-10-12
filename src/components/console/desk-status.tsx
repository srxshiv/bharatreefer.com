"use client";

import { useSyncExternalStore } from "react";
import { deskStatus, formatHours, type OpeningHours } from "@/lib/hours";
import { cn } from "@/lib/cn";

const TICK_MS = 30_000;

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, TICK_MS);
  return () => clearInterval(timer);
}

/** Current minute, so the status re-renders as the desk opens or closes. */
function getSnapshot() {
  return Math.floor(Date.now() / 60_000);
}

/** The server does not know the visitor's "now", so it renders the hours and the browser takes over. */
function getServerSnapshot() {
  return null;
}

export function DeskStatus({ hours, className }: { hours: OpeningHours; className?: string }) {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (minute === null) {
    return <span className={cn("text-ink-500", className)}>{formatHours(hours)}</span>;
  }

  const status = deskStatus(hours, new Date(minute * 60_000));
  return (
    <span className={cn("items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          status.open ? "bg-success shadow-[0_0_0_3px_rgb(27_127_75/0.18)]" : "bg-ink-300",
        )}
      />
      <span className={status.open ? "text-ink-900" : "text-ink-500"}>{status.label}</span>
    </span>
  );
}
