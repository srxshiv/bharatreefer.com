"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { ExternalLink, LoaderCircle, MapPin } from "lucide-react";
import { setTruckTrackingLinkAction } from "@/features/fleet/actions";
import { TRACKING_LINK_DAYS, isTrackingLinkFresh } from "@/features/fleet/tracking";
import type { FleetOutcome, FleetTruck } from "@/features/fleet/types";
import { cn } from "@/lib/cn";
import { formatPlate } from "@/features/fleet/plate";
import { FormMessage } from "../form-parts";
import { input } from "../ui";

const DAY_MS = 86_400_000;

/** "Set today", "Set 3 days ago". */
function setAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
  return days <= 0 ? "Set today" : days === 1 ? "Set yesterday" : `Set ${days} days ago`;
}

/**
 * Opens a truck's live location in a new tab, from its card. An amber dot says the link is
 * over two weeks old and has probably stopped working.
 */
export function LocationButton({ truck, className }: { truck: FleetTruck; className?: string }) {
  if (!truck.trackingUrl) return null;
  const fresh = isTrackingLinkFresh(truck.trackingUrlSetAt);
  return (
    <a
      href={truck.trackingUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={fresh ? "Live location" : `Live location (the link is over ${TRACKING_LINK_DAYS} days old)`}
      aria-label={`Live location of ${formatPlate(truck.plateNumber)}${fresh ? "" : ", link may have expired"}`}
      className={cn("relative inline-flex size-9 items-center justify-center rounded-lg text-ice-700 transition-colors hover:bg-ice-50", className)}
    >
      <MapPin aria-hidden="true" className="size-4" />
      {fresh ? null : <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-saffron-500 ring-2 ring-surface" />}
    </a>
  );
}

/**
 * The truck's live location link in its sheet: open it, and (admins) paste a new one when it
 * runs out, which GPS tracker links do after about two weeks. Customers get it in the email
 * about their truck the day before pickup.
 */
export function TrackingLinkSection({
  truck,
  canManage,
  notify,
}: {
  truck: FleetTruck;
  canManage: boolean;
  notify: (outcome: FleetOutcome) => void;
}) {
  const id = useId();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const fresh = isTrackingLinkFresh(truck.trackingUrlSetAt);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const url = String(new FormData(event.currentTarget).get("trackingUrl") ?? "");
    startTransition(async () => {
      try {
        const outcome = await setTruckTrackingLinkAction(truck.id, url);
        if (outcome.ok) {
          setError(undefined);
          notify(outcome);
        } else {
          setError(outcome.error);
        }
      } catch {
        setError("Could not save. Check your connection and try again.");
      }
    });
  }

  return (
    <section>
      <h3 className="caption text-ink-500">Live location</h3>
      {truck.trackingUrl ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <a
            href={truck.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-frost-300 bg-surface px-3 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-400"
          >
            <MapPin aria-hidden="true" className="size-4 text-ice-600" />
            Open live location
            <ExternalLink aria-hidden="true" className="size-3.5 text-ink-400" />
          </a>
          {truck.trackingUrlSetAt ? (
            <span className={cn("text-sm", fresh ? "text-ink-500" : "font-medium text-saffron-600")}>
              {setAgo(truck.trackingUrlSetAt)}
              {fresh ? "" : `: over ${TRACKING_LINK_DAYS} days old, it has probably stopped working.`}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-500">
          {canManage ? "No link yet. Paste the share link from the truck's GPS tracker." : "No live location link yet."}
        </p>
      )}

      {canManage ? (
        // noValidate: a link pasted without "https://" is fine (parseTrackingUrl adds it); the
        // browser's own check for url fields would refuse it without a word.
        <form key={truck.trackingUrl ?? ""} noValidate onSubmit={save} className="mt-3 space-y-2">
          <label htmlFor={`${id}-url`} className="sr-only">
            Tracking link
          </label>
          <div className="flex gap-2">
            <input
              id={`${id}-url`}
              name="trackingUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              defaultValue={truck.trackingUrl ?? ""}
              placeholder="https://"
              className={cn(input, "h-10 min-w-0 flex-1 font-mono text-sm")}
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-progress disabled:opacity-70"
            >
              {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
              {pending ? "Saving" : "Save"}
            </button>
          </div>
          <p className="text-xs text-ink-500">Links from GPS trackers last about two weeks. Leave it empty to remove it.</p>
          <FormMessage state={{ error }} />
        </form>
      ) : null}
    </section>
  );
}
