"use client";

import { useId, useState, useTransition } from "react";
import { LoaderCircle, MessageCircle, Play, Send } from "lucide-react";
import { sendTrackingLinkAction } from "@/features/fleet/actions";
import { formatPlate } from "@/features/fleet/plate";
import { parseTrackingUrl, trackingWhatsappMessage } from "@/features/fleet/tracking";
import type { FleetOutcome, FleetTruck } from "@/features/fleet/types";
import { cn } from "@/lib/cn";
import { formatKg } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { FormMessage } from "../form-parts";
import { input, label, primaryButton, secondaryButton } from "../ui";
import { NumberPlate } from "./number-plate";
import { tripSince } from "./trip-button";

const whatsappButton =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-frost-300 bg-surface px-2.5 text-xs font-semibold text-ink-900 transition-colors hover:border-ink-400";

export function TrackingSheetTitle({ truck, starting }: { truck: FleetTruck; starting: boolean }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink-950">
        {starting && truck.status === "AVAILABLE" ? "Start the trip" : "Send tracking link"}
      </h2>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <NumberPlate plate={truck.plateNumber} />
        {truck.model ? <span className="text-sm text-ink-500">{truck.model}</span> : null}
      </div>
    </div>
  );
}

/**
 * The truck, who has loads on it, and the trip's tracking link to send them: by email to
 * everyone ticked, or on WhatsApp one by one. Opened from Start trip (`starting`), the trip
 * starts here, with the link or without; afterwards the link can be sent again any time.
 */
export function TrackingSheetBody({
  truck,
  starting,
  businessName,
  onStartTrip,
  onDone,
  notify,
}: {
  truck: FleetTruck;
  starting: boolean;
  businessName: string;
  /** Shows the trip started on the board straight away, then saves it. */
  onStartTrip: () => Promise<FleetOutcome>;
  onDone: () => void;
  notify: (outcome: FleetOutcome) => void;
}) {
  const id = useId();
  const [link, setLink] = useState("");
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();

  const url = parseTrackingUrl(link);
  const plate = formatPlate(truck.plateNumber);
  const loads = truck.loads.filter((load) => load.visible);
  const recipients = loads.filter((load) => load.email && !skipped.has(load.quoteId));
  const emailCount = recipients.length === 1 ? "1 customer" : `${recipients.length} customers`;
  // Once the trip has started the sheet stays open, to send the link on WhatsApp too.
  const toStart = starting && truck.status === "AVAILABLE";

  function toggle(quoteId: string) {
    setSkipped((current) => {
      const next = new Set(current);
      if (!next.delete(quoteId)) next.add(quoteId);
      return next;
    });
  }

  /** Starts the trip first when `withTrip`, then emails the link to everyone ticked. */
  function send(withTrip: boolean) {
    if (pending) return;
    if (!url && (recipients.length > 0 || !withTrip)) {
      setResult({ error: "Paste the tracking link first. It starts with https://" });
      return;
    }
    startTransition(async () => {
      try {
        let started = "";
        if (withTrip) {
          const outcome = await onStartTrip();
          if (!outcome.ok) {
            setResult({ error: outcome.error });
            return;
          }
          started = `${outcome.message} `;
        }
        if (!url || recipients.length === 0) {
          setResult({ success: `${started}Send the link on WhatsApp below.` });
          return;
        }
        const sent = await sendTrackingLinkAction(
          truck.id,
          url,
          recipients.map((load) => load.quoteId),
        );
        setResult(sent.ok ? { success: `${started}${sent.message}` } : { error: started ? `${started}The link was not sent: ${sent.error}` : sent.error });
      } catch {
        setResult({ error: "Could not save. Check your connection and try again." });
      }
    });
  }

  function startWithoutLink() {
    if (pending) return;
    startTransition(async () => {
      try {
        const outcome = await onStartTrip();
        if (!outcome.ok) {
          setResult({ error: outcome.error });
          return;
        }
        notify(outcome);
        onDone();
      } catch {
        setResult({ error: "Could not save. Check your connection and try again." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-frost-50 p-3 text-sm text-ink-700">
        <p>
          <span className="font-semibold text-ink-950">
            {truck.status === "ON_TRIP" ? "On a trip." : "Loading at the depot."}
          </span>{" "}
          {truck.status === "ON_TRIP" && truck.tripStartedAt ? `${tripSince(truck.tripStartedAt)}. ` : null}
          <span className="font-mono">{formatKg(truck.usedKg)}</span> on board for{" "}
          {loads.length === 1 ? "1 customer" : `${loads.length} customers`}.
        </p>
        {truck.driverName || truck.driverPhone ? (
          <p className="mt-1">
            Driver: {truck.driverName ?? "not named"}
            {truck.driverPhone ? <span className="ml-1.5 font-mono">{formatIndianMobile(truck.driverPhone)}</span> : null}
          </p>
        ) : null}
      </section>

      <div>
        <label htmlFor={`${id}-link`} className={label}>
          Tracking link
        </label>
        <input
          id={`${id}-link`}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={link}
          onChange={(event) => {
            setLink(event.target.value);
            setResult({});
          }}
          placeholder="https://"
          className={cn(input, "mt-1.5 font-mono text-sm")}
        />
        <p className={cn("mt-1.5 text-sm", link.trim() && !url ? "text-danger" : "text-ink-500")}>
          {link.trim() && !url
            ? "That does not look like a web link."
            : "The live location link from the truck's GPS tracker, or a shared Google Maps location."}
        </p>
      </div>

      <section>
        <h3 className="caption text-ink-500">Send to</h3>
        {loads.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-frost-300 px-4 py-5 text-center text-sm text-ink-500">
            Nothing is on this truck.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-frost-200 rounded-xl border border-frost-200">
            {loads.map((load) => (
              <li key={load.assignmentId} className="flex items-start gap-3 px-3 py-3">
                <input
                  id={`${id}-${load.quoteId}`}
                  type="checkbox"
                  checked={Boolean(load.email) && !skipped.has(load.quoteId)}
                  disabled={!load.email}
                  onChange={() => toggle(load.quoteId)}
                  aria-label={load.email ? `Email ${load.contactName}` : `${load.contactName} has no email address`}
                  className="mt-1 size-4 shrink-0 accent-navy-900 disabled:opacity-40"
                />
                <label htmlFor={`${id}-${load.quoteId}`} className="min-w-0 flex-1">
                  <span className="block font-medium text-ink-950">
                    {load.contactName} <span className="ml-1 font-mono text-xs font-normal text-ink-500">{load.reference}</span>
                  </span>
                  <span className="block text-xs text-ink-500">
                    {load.originCity} to {load.destinationCity} · {formatKg(load.loadKg)}
                  </span>
                  <span className="block truncate text-xs text-ink-700">
                    {load.email ?? "No email, WhatsApp only"}
                    <span className="ml-1.5 font-mono text-ink-500">{formatIndianMobile(load.phone)}</span>
                  </span>
                </label>
                {url ? (
                  <a
                    href={whatsappLink(load.phone, trackingWhatsappMessage(load, plate, url, businessName))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={whatsappButton}
                  >
                    <MessageCircle aria-hidden="true" className="size-4" />
                    WhatsApp
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setResult({ error: "Paste the tracking link first. It starts with https://" })}
                    className={cn(whatsappButton, "text-ink-400")}
                  >
                    <MessageCircle aria-hidden="true" className="size-4" />
                    WhatsApp
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-3">
        <FormMessage state={result} />
        {toStart ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => send(true)} disabled={pending} className={primaryButton}>
              {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Play aria-hidden="true" className="size-4" />}
              {recipients.length > 0 ? `Start trip and email ${emailCount}` : "Start trip"}
            </button>
            {recipients.length > 0 ? (
              <button type="button" onClick={startWithoutLink} disabled={pending} className={secondaryButton}>
                Start without a link
              </button>
            ) : null}
          </div>
        ) : recipients.length > 0 ? (
          <button type="button" onClick={() => send(false)} disabled={pending} className={primaryButton}>
            {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
            {pending ? "Sending" : `Email the link to ${emailCount}`}
          </button>
        ) : loads.some((load) => load.email) ? (
          <p className="text-sm text-ink-500">Tick a customer to email them, or send the link on WhatsApp.</p>
        ) : (
          <p className="text-sm text-ink-500">No one on this truck left an email address. Send the link on WhatsApp.</p>
        )}
      </div>
    </div>
  );
}
