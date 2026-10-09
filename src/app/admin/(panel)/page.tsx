import { Suspense } from "react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { ArrowRight, Download, Search } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { card, input, primaryButton, secondaryButton } from "@/components/admin/ui";
import { BAND_STYLES } from "@/components/band-styles";
import { MATERIAL_LIST, MATERIALS } from "@/config/materials";
import { listQuoteRequests, type InboxRow } from "@/features/quotes/admin";
import {
  INBOX_PAGE_SIZE,
  inboxQuery,
  parseInboxFilters,
  type InboxFilters,
} from "@/features/quotes/filters";
import { QUOTE_STATUSES, STATUS_LABELS } from "@/features/quotes/status";
import { cn } from "@/lib/cn";
import { formatDateTimeInIndia } from "@/lib/dates";
import { LOAD_TYPE_LABELS, formatInr, formatKg, formatTrucks } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import { parseTruckPlan } from "@/lib/truck-plan";

export const metadata: Metadata = {
  title: "Quote requests",
};

const TABS = ["ALL", ...QUOTE_STATUSES] as const;

/** Column widths shared by the header row and every request row on wide screens. */
const COLUMNS =
  "lg:grid-cols-[9.5rem_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_6rem_6.5rem] lg:gap-x-5";

function Heading() {
  return <h1 className="text-2xl font-bold tracking-tight text-ink-950">Quote requests</h1>;
}

function InboxSkeleton() {
  return (
    <div className="space-y-6">
      <Heading />
      <div className="h-9 animate-pulse rounded-lg bg-frost-100" />
      <div className="h-11 animate-pulse rounded-lg bg-frost-100" />
      <div className="h-96 animate-pulse rounded-xl bg-frost-100" />
    </div>
  );
}

function RequestRow({ row }: { row: InboxRow }) {
  const band = MATERIALS[row.material];
  const cell = "lg:order-none lg:col-span-1 lg:justify-self-auto";

  return (
    <li>
      <Link
        href={`/admin/quotes/${row.id}`}
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-frost-50 lg:items-center",
          COLUMNS,
          // A bar down the left edge marks requests nobody has picked up yet.
          row.status === "NEW" && "shadow-[inset_3px_0_0_var(--color-ink-950)]",
        )}
      >
        <div className={cn("order-1", cell)}>
          <p className="font-mono text-sm font-semibold text-ink-950">{row.reference}</p>
          <p className="mt-0.5 text-xs text-ink-500">{formatDateTimeInIndia(row.createdAt)}</p>
        </div>

        <div className={cn("order-3 col-span-2 min-w-0", cell)}>
          <p className="truncate text-sm font-medium text-ink-950">{row.contactName}</p>
          <p className="mt-0.5 font-mono text-xs text-ink-500">{formatIndianMobile(row.phone)}</p>
        </div>

        <div className={cn("order-4 col-span-2 min-w-0", cell)}>
          <p className="truncate text-sm font-medium text-ink-950">
            {row.originCity}
            <ArrowRight aria-label="to" className="mx-1.5 inline size-3.5 text-ink-400" />
            {row.destinationCity}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {row.originState} to {row.destinationState}
          </p>
        </div>

        <div className={cn("order-5 min-w-0", cell)}>
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink-950">
            <span
              aria-hidden="true"
              className={cn("size-2 shrink-0 rounded-full", BAND_STYLES[row.material].fill)}
            />
            {band.label}, {formatKg(row.quantityKg)}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {formatTrucks(parseTruckPlan(row.truckPlan))},{" "}
            {LOAD_TYPE_LABELS[row.loadType].toLowerCase()}
          </p>
        </div>

        <p
          className={cn(
            "order-6 justify-self-end font-mono text-sm font-semibold text-ink-950 lg:text-right",
            cell,
          )}
        >
          {row.quotedAmount === null ? (
            <span className="font-normal text-ink-400">
              <span aria-hidden="true">—</span>
              <span className="sr-only">Not quoted</span>
            </span>
          ) : (
            formatInr(row.quotedAmount)
          )}
        </p>

        <div className={cn("order-2 justify-self-end", cell)}>
          <StatusBadge status={row.status} />
        </div>
      </Link>
    </li>
  );
}

function EmptyState({ filters, filtered }: { filters: InboxFilters; filtered: boolean }) {
  if (filtered || filters.status !== "ALL" || filters.page > 1) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="font-medium text-ink-950">No requests match this view.</p>
        <Link href="/admin" className={cn(secondaryButton, "mt-4")}>
          Show all requests
        </Link>
      </div>
    );
  }
  return (
    <div className="px-5 py-16 text-center">
      <p className="font-medium text-ink-950">No quote requests yet.</p>
      <p className="mt-1 text-sm text-ink-500">
        Requests sent from the website will appear here.
      </p>
    </div>
  );
}

async function Inbox({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const filters = parseInboxFilters(await searchParams);
  const { rows, total, pageCount, counts } = await listQuoteRequests(filters);

  const filtered = filters.q !== "" || filters.material !== "ALL";
  const firstShown = (filters.page - 1) * INBOX_PAGE_SIZE + 1;
  const page = (number: number) => `/admin${inboxQuery({ ...filters, page: number })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading />
        {/* A plain link: the browser downloads the file instead of navigating to it. */}
        <a href={`/admin/export${inboxQuery({ ...filters, page: 1 })}`} className={secondaryButton}>
          <Download aria-hidden="true" className="size-4" />
          Export CSV
        </a>
      </div>

      <nav aria-label="Filter by status" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <ul className="flex gap-1.5 pb-1 whitespace-nowrap">
          {TABS.map((status) => {
            const active = filters.status === status;
            return (
              <li key={status}>
                <Link
                  href={`/admin${inboxQuery({ ...filters, status, page: 1 })}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
                    active
                      ? "border-ink-950 bg-ink-950 text-white"
                      : "border-frost-300 bg-white text-ink-700 hover:border-ink-400",
                  )}
                >
                  {status === "ALL" ? "All" : STATUS_LABELS[status]}
                  <span className={cn("font-mono text-xs", active ? "text-ink-300" : "text-ink-500")}>
                    {counts[status]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Keyed on the filters so the fields reset when a link changes them. */}
      <Form
        key={`${filters.status}|${filters.material}|${filters.q}`}
        action="/admin"
        className="flex flex-col gap-2 sm:flex-row"
      >
        {filters.status !== "ALL" ? (
          <input type="hidden" name="status" value={filters.status.toLowerCase()} />
        ) : null}
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500"
          />
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            aria-label="Search requests"
            placeholder="Search reference, name, phone or city"
            maxLength={100}
            className={cn(input, "pl-9")}
          />
        </div>
        <select
          name="material"
          defaultValue={filters.material === "ALL" ? "" : filters.material.toLowerCase()}
          aria-label="Temperature band"
          className={cn(input, "sm:w-48")}
        >
          <option value="">All temperatures</option>
          {MATERIAL_LIST.map((band) => (
            <option key={band.id} value={band.id.toLowerCase()}>
              {band.label}
            </option>
          ))}
        </select>
        <button type="submit" className={primaryButton}>
          Search
        </button>
        {filtered ? (
          <Link href={`/admin${inboxQuery({ status: filters.status })}`} className={secondaryButton}>
            Clear
          </Link>
        ) : null}
      </Form>

      <div className={cn(card, "overflow-hidden")}>
        {rows.length === 0 ? (
          <EmptyState filters={filters} filtered={filtered} />
        ) : (
          <>
            <div
              aria-hidden="true"
              className={cn(
                "caption hidden border-b border-frost-200 bg-frost-50 px-5 py-3 text-ink-500 lg:grid",
                COLUMNS,
              )}
            >
              <span>Request</span>
              <span>Customer</span>
              <span>Route</span>
              <span>Cargo</span>
              <span className="text-right">Quoted</span>
              <span>Status</span>
            </div>
            <ul className="divide-y divide-frost-200">
              {rows.map((row) => (
                <RequestRow key={row.id} row={row} />
              ))}
            </ul>
          </>
        )}
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
          <p>
            Showing {firstShown} to {firstShown + rows.length - 1} of {total}
          </p>
          <div className="flex gap-2">
            {filters.page > 1 ? (
              <Link href={page(filters.page - 1)} className={secondaryButton}>
                Previous
              </Link>
            ) : null}
            {filters.page < pageCount ? (
              <Link href={page(filters.page + 1)} className={secondaryButton}>
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function InboxPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <Inbox searchParams={searchParams} />
    </Suspense>
  );
}
