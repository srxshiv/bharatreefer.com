import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Mail, MessageCircle, Phone, Truck } from "lucide-react";
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="caption text-ink-500">{label}</dt>
      <dd className="mt-1 text-ink-950">{children}</dd>
    </div>
  );
}

/** One of the four facts under the route, in a tile of equal size. */
function Stat({ label, children, detail }: { label: string; children: ReactNode; detail?: ReactNode }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="caption text-ink-500">{label}</dt>
      <dd className="mt-1.5 font-semibold text-ink-950">{children}</dd>
      {detail ? <dd className="mt-0.5 text-sm text-ink-500">{detail}</dd> : null}
    </div>
  );
}

function Place({ label, city, state, end = false }: { label: string; city: string; state: string; end?: boolean }) {
  return (
    <div className={cn("min-w-0", end && "@xl:text-right")}>
      <p className="caption text-ink-500">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold text-ink-950">{city}</p>
      <p className="truncate text-sm text-ink-500">{state}</p>
    </div>
  );
}

/**
 * Everything about one request: the customer, the load, its trucks, status and price, notes
 * and timeline. Shown as a full page at /desk/quotes/[id], and in a side panel when a request
 * is opened from another panel page (`inPanel`), where the panel shows the reference instead.
 */
export async function QuoteView({ id, inPanel = false, quoting = false }: { id: string; inPanel?: boolean; quoting?: boolean }) {
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
  const showTrucks = quote.status === "QUOTED" || assignments.length > 0;

  const band = bands[quote.material];
  const bandLabels = Object.fromEntries(MATERIAL_IDS.map((key) => [key, bands[key].label])) as Record<
    (typeof MATERIAL_IDS)[number],
    string
  >;
  const phone = formatIndianMobile(quote.phone);
  const creator = describeCreator(quote.createdBy);

  const contactButton = cn(secondaryButton, "min-w-0 flex-1 px-3");

  return (
    // The layout follows the width it is given (the side panel or the full page), not the screen.
    <div className="@container space-y-5">
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

      {/* The load at a glance: where from, where to, and the four facts dispatch needs. */}
      <section aria-labelledby={`${quote.id}-load`} className={cn(card, "overflow-hidden")}>
        <h2 id={`${quote.id}-load`} className="sr-only">
          Load
        </h2>
        <div className="grid gap-4 p-5 sm:p-6 @xl:grid-cols-[minmax(0,1fr)_minmax(5rem,14rem)_minmax(0,1fr)] @xl:items-center">
          <Place label="Loading from" city={quote.originCity} state={quote.originState} />
          <div aria-hidden="true" className="relative hidden h-px border-t border-dashed border-frost-400 @xl:block">
            <Truck className="absolute -top-2.5 left-1/2 size-5 -translate-x-1/2 bg-surface px-0.5 text-ice-600" />
          </div>
          <span className="sr-only">to</span>
          <Place label="Unloading at" city={quote.destinationCity} state={quote.destinationState} end />
        </div>
        <dl className="grid grid-cols-2 gap-px border-t border-frost-200 bg-frost-200 @2xl:grid-cols-4">
          <Stat label="Temperature" detail={band.range}>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className={cn("size-2.5 rounded-full", BAND_STYLES[quote.material].fill)} />
              {band.label}
            </span>
          </Stat>
          <Stat label="Weight">
            <span className="font-mono">{formatKg(quote.quantityKg)}</span>
          </Stat>
          <Stat label="Suggested vehicle" detail={LOAD_TYPE_LABELS[quote.loadType]}>
            <span className="font-mono">{formatTrucks(parseTruckPlan(quote.truckPlan))}</span>
          </Stat>
          <Stat label="Pickup">
            {quote.pickupDate ? formatIsoDate(toIsoDate(quote.pickupDate)) : <span className="font-normal text-ink-500">Not given</span>}
          </Stat>
        </dl>
        <div className="border-t border-frost-200 px-5 py-4 sm:px-6">
          <p className="caption text-ink-500">Customer notes</p>
          {quote.notes ? (
            <p className="mt-1 whitespace-pre-wrap text-ink-950">{quote.notes}</p>
          ) : (
            <p className="mt-1 text-ink-500">None</p>
          )}
        </div>
      </section>

      {/* Side by side, the same height: who to talk to, and where the request stands. */}
      <div className="grid gap-5 @2xl:grid-cols-2">
        <section className={cn(card, "flex flex-col p-5 sm:p-6")}>
          <h2 className={sectionTitle}>Customer</h2>
          <p className="mt-3 text-xl font-semibold text-ink-950">{quote.contactName}</p>
          {quote.companyName ? <p className="text-sm font-medium text-ink-600">{quote.companyName}</p> : null}
          <dl className="mt-4 space-y-4">
            <Field label="Mobile">
              <span className="font-mono">+91 {phone}</span>
            </Field>
            <Field label="Email">
              {quote.email ? <span className="break-all">{quote.email}</span> : <span className="text-ink-500">Not given</span>}
            </Field>
            <Field label="Brought by">
              {/* Admins see who it is in the picker they change it with. */}
              {isAdmin ? (
                <div className="mt-1.5">
                  <ReferrerForm quoteId={quote.id} referrerCode={quote.referrer?.promoCode ?? null} options={referrers} />
                </div>
              ) : quote.referrer ? (
                <>
                  {quote.referrer.name} <span className="font-mono text-sm text-ink-500">· code {quote.referrer.promoCode}</span>
                </>
              ) : (
                <span className="text-ink-500">Nobody: no promo code</span>
              )}
            </Field>
          </dl>
          <div className="mt-auto flex gap-2 pt-6">
            <a href={`tel:${quote.phone}`} className={contactButton}>
              <Phone aria-hidden="true" className="size-4 shrink-0" />
              Call
            </a>
            <a
              href={whatsappLink(quote.phone, dispatchWhatsappMessage(quote, business.name, bandLabels))}
              target="_blank"
              rel="noopener noreferrer"
              className={contactButton}
            >
              <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
              WhatsApp
            </a>
            {quote.email ? (
              <a
                href={`mailto:${quote.email}?subject=${encodeURIComponent(`Your quote request ${quote.reference}`)}`}
                className={contactButton}
              >
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                Email
              </a>
            ) : null}
          </div>
        </section>

        <section className={cn(card, "p-5 sm:p-6")}>
          <h2 className={cn(sectionTitle, "mb-4")}>Status and quote</h2>
          <QuoteUpdateForm
            id={quote.id}
            status={quote.status}
            quotedAmount={quote.quotedAmount}
            pickupDate={quote.pickupDate ? toIsoDate(quote.pickupDate) : null}
            startAt={quoting && quote.status !== "QUOTED" ? "QUOTED" : undefined}
          />
        </section>
      </div>

      {showTrucks ? (
        <section className={cn(card, "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className={sectionTitle}>Trucks</h2>
            <span className="font-mono text-sm text-ink-500">
              {formatKg(placedKg)} of {formatKg(quote.quantityKg)} placed
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-frost-100" aria-hidden="true">
            <div
              className={cn("h-full rounded-full", BAND_STYLES[quote.material].fill)}
              style={{ width: `${Math.min(100, (placedKg / quote.quantityKg) * 100)}%` }}
            />
          </div>
          {assignments.length > 0 ? (
            <ul className="mt-4 grid gap-3 @2xl:grid-cols-2">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="rounded-xl border border-frost-200 bg-frost-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <NumberPlate plate={assignment.plateNumber} />
                    <span className="font-mono text-sm font-semibold text-ink-950">{formatKg(assignment.loadKg)}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-500">
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
          {quote.status === "QUOTED" ? (
            <ChooseTruckButton
              quoteId={quote.id}
              label={
                placedKg >= quote.quantityKg || (!isAdmin && placedKg + askedKg >= quote.quantityKg)
                  ? "View in fleet"
                  : isAdmin
                    ? "Choose truck"
                    : "Request truck"
              }
              className={cn(secondaryButton, "mt-5 w-full @2xl:w-auto")}
            />
          ) : (
            <p className="mt-4 text-xs text-ink-500">Kept as a record. Completed requests no longer take up space.</p>
          )}
        </section>
      ) : null}

      <section className={cn(card, "p-5 sm:p-6")}>
        <h2 className={cn(sectionTitle, "mb-4")}>Notes and activity</h2>
        <div className="grid gap-6 @3xl:grid-cols-[18rem_minmax(0,1fr)] @3xl:gap-8">
          <NoteForm id={quote.id} />

          {/* Newest first, on a rail so each entry reads as a step in the request's story. */}
          <ol className="space-y-4 border-t border-frost-200 pt-5 @3xl:border-t-0 @3xl:border-l @3xl:pt-0 @3xl:pl-6">
            {quote.activities.map((activity) => (
              <li key={activity.id} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.85rem] hidden size-2.5 rounded-full border-2 border-surface bg-frost-400 @3xl:block" />
                <p
                  className={
                    activity.type === "NOTE"
                      ? "rounded-lg border border-frost-200 bg-frost-50 px-3 py-2 text-sm whitespace-pre-wrap text-ink-950"
                      : "text-sm text-ink-900"
                  }
                >
                  {activity.body}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  {activity.author?.name ?? "System"}, {formatDateTimeInIndia(activity.createdAt)}
                </p>
              </li>
            ))}
            <li className="relative">
              <span aria-hidden="true" className="absolute top-1.5 -left-[1.85rem] hidden size-2.5 rounded-full border-2 border-surface bg-navy-900 @3xl:block" />
              <p className="text-sm text-ink-900">
                {creator ? "Request entered for the customer" : "Request received from the website"}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {quote.createdBy ? `${quote.createdBy.name}, ` : null}
                {formatDateTimeInIndia(quote.createdAt)}
              </p>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
