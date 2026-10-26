import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { NumberPlate } from "@/components/admin/fleet/number-plate";
import { NoteForm } from "@/components/admin/note-form";
import { QuoteUpdateForm } from "@/components/admin/quote-update-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { card, secondaryButton } from "@/components/admin/ui";
import { BAND_STYLES } from "@/components/band-styles";
import { MATERIAL_IDS } from "@/config/materials";
import { requireUser } from "@/features/auth/session";
import { getSiteContent } from "@/features/content/data";
import { getQuoteAssignments, getQuoteLoadRequests } from "@/features/fleet/data";
import { getQuoteRequest, listReferrers } from "@/features/quotes/admin";
import { dispatchWhatsappMessage } from "@/features/quotes/messages";
import { cn } from "@/lib/cn";
import { formatDateTimeInIndia, formatIsoDate, toIsoDate } from "@/lib/dates";
import { LOAD_TYPE_LABELS, formatCapacity, formatKg, formatTrucks } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import { parseTruckPlan } from "@/lib/truck-plan";
import { whatsappLink } from "@/lib/whatsapp";
import { ChooseTruckButton } from "./choose-truck-button";
import { describeCreator } from "./creator";
import { ReferrerForm } from "./referrer-form";

const sectionTitle = "font-sans text-base font-semibold text-ink-950";

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="caption text-ink-500">{label}</dt>
      <dd className="mt-1 text-ink-950">{children}</dd>
    </div>
  );
}

/**
 * Everything about one request: the customer, the load, its trucks, status and price, notes
 * and timeline. Shown as a full page at /desk/quotes/[id], and in a side panel when a request
 * is opened from another panel page (`inPanel`), where the panel shows the reference instead.
 */
export async function QuoteView({ id, inPanel = false }: { id: string; inPanel?: boolean }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const [quote, { business, bands }, assignments, asks, referrers] = await Promise.all([
    getQuoteRequest(id),
    getSiteContent(),
    getQuoteAssignments(id),
    getQuoteLoadRequests(id),
    isAdmin ? listReferrers() : [],
  ]);
  if (!quote) notFound();
  const askedKg = asks.reduce((sum, ask) => sum + ask.loadKg, 0);
  const placedKg = assignments.reduce((sum, assignment) => sum + assignment.loadKg, 0);
  const showTrucks = quote.status === "CONFIRMED" || assignments.length > 0;

  const band = bands[quote.material];
  const bandLabels = Object.fromEntries(MATERIAL_IDS.map((key) => [key, bands[key].label])) as Record<
    (typeof MATERIAL_IDS)[number],
    string
  >;
  const phone = formatIndianMobile(quote.phone);
  const creator = describeCreator(quote.createdBy);

  return (
    <div className="space-y-6">
      {inPanel ? null : (
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-wide text-ink-950">
              {quote.reference}
            </h1>
            <StatusBadge status={quote.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {creator ? `Entered by ${creator}, ` : "Received "}
            {formatDateTimeInIndia(quote.createdAt)}
          </p>
        </div>
      )}

      <div className={cn("grid items-start gap-6", inPanel ? "md:grid-cols-[minmax(0,1fr)_21rem]" : "lg:grid-cols-[minmax(0,1fr)_23rem]")}>
        <div className="space-y-6">
          <section className={cn(card, "p-6")}>
            <h2 className={sectionTitle}>Customer</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field label="Name">{quote.contactName}</Field>
              <Field label="Mobile">
                <span className="font-mono">+91 {phone}</span>
              </Field>
              <Field label="Email" wide>
                {quote.email ? (
                  <span className="break-all">{quote.email}</span>
                ) : (
                  <span className="text-ink-500">Not given</span>
                )}
              </Field>
              <Field label="Brought by" wide>
                {quote.referrer ? (
                  <>
                    {quote.referrer.name} <span className="font-mono text-sm text-ink-500">· code {quote.referrer.promoCode}</span>
                  </>
                ) : (
                  <span className="text-ink-500">Nobody: no promo code</span>
                )}
                {isAdmin ? (
                  <div className="mt-2">
                    <ReferrerForm quoteId={quote.id} referrerCode={quote.referrer?.promoCode ?? null} options={referrers} />
                  </div>
                ) : null}
              </Field>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={`tel:${quote.phone}`} className={secondaryButton}>
                <Phone aria-hidden="true" className="size-4" />
                Call
              </a>
              <a
                href={whatsappLink(quote.phone, dispatchWhatsappMessage(quote, business.name, bandLabels))}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryButton}
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                WhatsApp
              </a>
              {quote.email ? (
                <a
                  href={`mailto:${quote.email}?subject=${encodeURIComponent(`Your quote request ${quote.reference}`)}`}
                  className={secondaryButton}
                >
                  <Mail aria-hidden="true" className="size-4" />
                  Email
                </a>
              ) : null}
            </div>
          </section>

          <section className={cn(card, "p-6")}>
            <h2 className={sectionTitle}>Load</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field label="Loading from">
                {quote.originCity}, {quote.originState}
              </Field>
              <Field label="Unloading at">
                {quote.destinationCity}, {quote.destinationState}
              </Field>
              <Field label="Temperature">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn("size-2 rounded-full", BAND_STYLES[quote.material].fill)}
                  />
                  {band.label}, {band.range}
                </span>
              </Field>
              <Field label="Weight">
                <span className="font-mono">{formatKg(quote.quantityKg)}</span>
              </Field>
              <Field label="Suggested vehicle">
                <span className="font-mono">{formatTrucks(parseTruckPlan(quote.truckPlan))}</span>,{" "}
                {LOAD_TYPE_LABELS[quote.loadType].toLowerCase()}
              </Field>
              <Field label="Pickup date">
                {quote.pickupDate ? (
                  formatIsoDate(toIsoDate(quote.pickupDate))
                ) : (
                  <span className="text-ink-500">Not given</span>
                )}
              </Field>
              <Field label="Customer notes" wide>
                {quote.notes ? (
                  <span className="whitespace-pre-wrap">{quote.notes}</span>
                ) : (
                  <span className="text-ink-500">None</span>
                )}
              </Field>
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          {showTrucks ? (
            <section className={cn(card, "p-6")}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className={sectionTitle}>Trucks</h2>
                <span className="font-mono text-sm text-ink-500">
                  {formatKg(placedKg)} of {formatKg(quote.quantityKg)}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-frost-100" aria-hidden="true">
                <div
                  className={cn("h-full rounded-full", BAND_STYLES[quote.material].fill)}
                  style={{ width: `${Math.min(100, (placedKg / quote.quantityKg) * 100)}%` }}
                />
              </div>
              {assignments.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {assignments.map((assignment) => (
                    <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <NumberPlate plate={assignment.plateNumber} />
                      <span className="font-mono text-sm font-semibold text-ink-950">{formatKg(assignment.loadKg)}</span>
                      <p className="w-full text-xs text-ink-500">
                        <span
                          className={cn(
                            "font-semibold",
                            assignment.deliveredAt ? "text-success" : assignment.status === "ON_TRIP" ? "text-ice-700" : "text-ink-700",
                          )}
                        >
                          {assignment.deliveredAt
                            ? `Delivered ${formatDateTimeInIndia(assignment.deliveredAt)}`
                            : assignment.status === "ON_TRIP"
                              ? "On the road"
                              : "Loading"}
                        </span>
                        {" · "}
                        {formatCapacity(assignment.capacityKg)} truck
                        {assignment.driverName ? ` · ${assignment.driverName}` : ""}
                        {assignment.driverPhone ? (
                          <>
                            {" · "}
                            <a href={`tel:${assignment.driverPhone}`} className="font-mono text-ice-700 hover:underline">
                              {formatIndianMobile(assignment.driverPhone)}
                            </a>
                          </>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-ink-500">Not on a truck yet.</p>
              )}
              {asks.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {asks.map((ask) => (
                    <li key={ask.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-saffron-50 px-3 py-2 text-xs text-ink-700">
                      <span className="font-semibold text-saffron-600">Waiting for approval:</span>
                      <span className="font-mono font-semibold text-ink-950">{formatKg(ask.loadKg)}</span> on
                      <NumberPlate plate={ask.plateNumber} />
                      {ask.requestedBy ? <span>asked by {ask.requestedBy}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {quote.status === "CONFIRMED" ? (
                <ChooseTruckButton
                  quoteId={quote.id}
                  label={
                    placedKg >= quote.quantityKg || (!isAdmin && placedKg + askedKg >= quote.quantityKg)
                      ? "View in fleet"
                      : isAdmin
                        ? "Choose truck"
                        : "Request truck"
                  }
                  className={cn(secondaryButton, "mt-5 w-full")}
                />
              ) : (
                <p className="mt-4 text-xs text-ink-500">Kept as a record. Completed requests no longer take up space.</p>
              )}
            </section>
          ) : null}

          <section className={cn(card, "p-6")}>
            <h2 className={cn(sectionTitle, "mb-4")}>Status and quote</h2>
            <QuoteUpdateForm id={quote.id} status={quote.status} quotedAmount={quote.quotedAmount} />
          </section>

          <section className={cn(card, "p-6")}>
            <h2 className={cn(sectionTitle, "mb-4")}>Notes and activity</h2>
            <NoteForm id={quote.id} />

            <ol className="mt-6 space-y-4 border-t border-frost-200 pt-5">
              {quote.activities.map((activity) => (
                <li key={activity.id}>
                  <p
                    className={
                      activity.type === "NOTE"
                        ? "rounded-lg border border-frost-200 bg-frost-50 px-3 py-2 text-sm whitespace-pre-wrap text-ink-950"
                        : "text-sm text-ink-700"
                    }
                  >
                    {activity.body}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {activity.author?.name ?? "System"}, {formatDateTimeInIndia(activity.createdAt)}
                  </p>
                </li>
              ))}
              <li>
                <p className="text-sm text-ink-700">
                  {creator ? "Request entered for the customer" : "Request received from the website"}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  {quote.createdBy ? `${quote.createdBy.name}, ` : null}
                  {formatDateTimeInIndia(quote.createdAt)}
                </p>
              </li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
