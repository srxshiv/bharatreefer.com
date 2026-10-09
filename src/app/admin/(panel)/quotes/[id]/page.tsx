import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import { NoteForm } from "@/components/admin/note-form";
import { QuoteUpdateForm } from "@/components/admin/quote-update-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { card, secondaryButton } from "@/components/admin/ui";
import { BAND_STYLES } from "@/components/band-styles";
import { MATERIALS } from "@/config/materials";
import { getQuoteRequest } from "@/features/quotes/admin";
import { dispatchWhatsappMessage } from "@/features/quotes/messages";
import { cn } from "@/lib/cn";
import { formatDateTimeInIndia, formatIsoDate, toIsoDate } from "@/lib/dates";
import { LOAD_TYPE_LABELS, formatKg, formatTrucks } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import { parseTruckPlan } from "@/lib/truck-plan";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Quote request",
};

const sectionTitle = "font-sans text-base font-semibold text-ink-950";

function BackLink() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ice-700 hover:text-ink-950"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Quote requests
    </Link>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="caption text-ink-500">{label}</dt>
      <dd className="mt-1 text-ink-950">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <BackLink />
      <div className="h-10 w-56 animate-pulse rounded-lg bg-frost-100" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="h-96 animate-pulse rounded-xl bg-frost-100" />
        <div className="h-96 animate-pulse rounded-xl bg-frost-100" />
      </div>
    </div>
  );
}

async function QuoteView({ params }: Pick<PageProps<"/admin/quotes/[id]">, "params">) {
  const { id } = await params;
  const quote = await getQuoteRequest(id);
  if (!quote) notFound();

  const band = MATERIALS[quote.material];
  const phone = formatIndianMobile(quote.phone);

  return (
    <div className="space-y-6">
      <BackLink />

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-wide text-ink-950">
            {quote.reference}
          </h1>
          <StatusBadge status={quote.status} />
        </div>
        <p className="mt-1 text-sm text-ink-500">
          Received {formatDateTimeInIndia(quote.createdAt)}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
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
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={`tel:${quote.phone}`} className={secondaryButton}>
                <Phone aria-hidden="true" className="size-4" />
                Call
              </a>
              <a
                href={whatsappLink(quote.phone, dispatchWhatsappMessage(quote))}
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
                <p className="text-sm text-ink-700">Request received from the website</p>
                <p className="mt-1 text-xs text-ink-500">
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

export default function QuotePage({ params }: PageProps<"/admin/quotes/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <QuoteView params={params} />
    </Suspense>
  );
}
