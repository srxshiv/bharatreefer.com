import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { ArrowRight, Columns3, Download, List, Search, SlidersHorizontal, X } from "lucide-react";
import { PendingHint } from "@/components/admin/pending-hint";
import { PipelineBoard } from "@/components/admin/requests/board";
import { Pipeline } from "@/components/admin/requests/pipeline";
import { StatusBadge } from "@/components/admin/status-badge";
import { card, input, label, primaryButton, secondaryButton } from "@/components/admin/ui";
import { BAND_STYLES } from "@/components/band-styles";
import { MATERIAL_IDS, type MaterialId, type TemperatureBandInfo } from "@/config/materials";
import { REGION_NAMES } from "@/data/india-locations";
import { getSiteContent } from "@/features/content/data";
import { BOARD_STAGES, listBoard, listQuoteRequests, type BoardStage, type InboxRow } from "@/features/quotes/admin";
import {
  DEFAULT_INBOX_FILTERS,
  INBOX_PAGE_SIZE,
  SORT_IDS,
  SORT_LABELS,
  hasAdvancedFilters,
  inboxQuery,
  isFiltered,
  parseInboxFilters,
  type InboxFilters,
} from "@/features/quotes/filters";
import { cn } from "@/lib/cn";
import { formatDateTimeInIndia, formatIsoDate } from "@/lib/dates";
import { LOAD_TYPE_LABELS, formatInr, formatKg, formatTrucks } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import { parseTruckPlan } from "@/lib/truck-plan";

export const metadata: Metadata = {
  title: "Quote requests",
};

// Renders complete on the server (one round trip, about 0.2 s): no skeleton flash. The
// progress bar at the top of the panel shows a click was registered.
export const instant = false;

/** Column widths shared by the header row and every request row on wide screens. */
const COLUMNS =
  "lg:grid-cols-[9.5rem_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_6rem_6.5rem] lg:gap-x-5";

function Header({ filters }: { filters: InboxFilters }) {
  const views = [
    { id: "list", label: "List", icon: List, href: `/admin${inboxQuery({ ...filters, view: "list" })}` },
    { id: "board", label: "Board", icon: Columns3, href: `/admin${inboxQuery({ ...filters, view: "board", status: "ALL", page: 1 })}` },
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-ink-950">Quote requests</h1>
      <div className="flex items-center gap-2">
        <nav aria-label="View" className="flex rounded-lg bg-frost-100 p-1">
          {views.map((view) => {
            const active = filters.view === view.id;
            const Icon = view.icon;
            return (
              <Link
                key={view.id}
                href={view.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-all",
                  active ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-950",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {view.label}
                <PendingHint />
              </Link>
            );
          })}
        </nav>
        {/* A plain link: the browser downloads the file instead of navigating to it. */}
        <a href={`/admin/export${inboxQuery({ ...filters, view: "list", page: 1 })}`} className={secondaryButton}>
          <Download aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sr-only sm:hidden">Export CSV</span>
        </a>
      </div>
    </div>
  );
}

function RequestRow({ row, bands }: { row: InboxRow; bands: Record<MaterialId, TemperatureBandInfo> }) {
  const band = bands[row.material];
  const cell = "lg:order-none lg:col-span-1 lg:justify-self-auto";

  return (
    <li>
      <Link
        href={`/admin/quotes/${row.id}`}
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-frost-50 lg:items-center",
          COLUMNS,
          // A bar down the left edge marks requests nobody has picked up yet.
          row.status === "NEW" && "shadow-[inset_3px_0_0_var(--color-ice-500)]",
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
            {row.pickupDate ? ` · pickup ${formatIsoDate(row.pickupDate.toISOString().slice(0, 10))}` : ""}
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

function EmptyState({ filters }: { filters: InboxFilters }) {
  if (isFiltered(filters) || filters.status !== "ALL" || filters.page > 1) {
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

type Chip = { label: string; clear: Partial<InboxFilters> };

/** The filters in force, each with the change that removes it. */
function activeChips(filters: InboxFilters, bands: Record<MaterialId, TemperatureBandInfo>): Chip[] {
  const chips: Chip[] = [];
  if (filters.q) chips.push({ label: `“${filters.q}”`, clear: { q: "" } });
  if (filters.material !== "ALL") chips.push({ label: bands[filters.material].label, clear: { material: "ALL" } });
  if (filters.loadType !== "ALL") chips.push({ label: LOAD_TYPE_LABELS[filters.loadType], clear: { loadType: "ALL" } });
  if (filters.quoted !== "ANY") chips.push({ label: filters.quoted === "YES" ? "Quoted" : "Not quoted", clear: { quoted: "ANY" } });
  if (filters.originState) chips.push({ label: `From ${filters.originState}`, clear: { originState: "" } });
  if (filters.destinationState) chips.push({ label: `To ${filters.destinationState}`, clear: { destinationState: "" } });
  if (filters.from || filters.to) {
    const range = [filters.from && formatIsoDate(filters.from), filters.to && formatIsoDate(filters.to)].filter(Boolean).join(" to ");
    chips.push({ label: `Received ${filters.from && filters.to ? range : filters.from ? `from ${range}` : `until ${range}`}`, clear: { from: "", to: "" } });
  }
  if (filters.pickupFrom || filters.pickupTo) {
    const range = [filters.pickupFrom && formatIsoDate(filters.pickupFrom), filters.pickupTo && formatIsoDate(filters.pickupTo)].filter(Boolean).join(" to ");
    chips.push({ label: `Pickup ${filters.pickupFrom && filters.pickupTo ? range : filters.pickupFrom ? `from ${range}` : `until ${range}`}`, clear: { pickupFrom: "", pickupTo: "" } });
  }
  if (filters.sort !== "newest") chips.push({ label: SORT_LABELS[filters.sort], clear: { sort: "newest" } });
  return chips;
}

const selectField = cn(input, "mt-1.5");
const dateField = cn(input, "mt-1.5 font-mono");

function Filters({ filters, bands }: { filters: InboxFilters; bands: Record<MaterialId, TemperatureBandInfo> }) {
  const chips = activeChips(filters, bands);
  const advanced = hasAdvancedFilters(filters);

  return (
    <>
      {/* Keyed on the filters so the fields reset when a link changes them. */}
      <Form key={inboxQuery(filters)} action="/admin" className="space-y-3">
        {filters.status !== "ALL" && filters.view === "list" ? (
          <input type="hidden" name="status" value={filters.status.toLowerCase()} />
        ) : null}
        {filters.view === "board" ? <input type="hidden" name="view" value="board" /> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
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
            className={cn(input, "sm:w-44")}
          >
            <option value="">All temperatures</option>
            {MATERIAL_IDS.map((id) => (
              <option key={id} value={id.toLowerCase()}>
                {bands[id].label}
              </option>
            ))}
          </select>
          <button type="submit" className={primaryButton}>
            Search
          </button>
          {isFiltered(filters) ? (
            <Link href={`/admin${inboxQuery({ status: filters.status, view: filters.view })}`} className={secondaryButton}>
              Clear
            </Link>
          ) : null}
        </div>

        <details open={advanced} className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-ink-700 hover:text-navy-900 [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            More filters
            <span className="text-ink-400 group-open:hidden">(dates, route, load type, sorting)</span>
          </summary>
          <div className={cn(card, "mt-3 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4")}>
            <div>
              <label htmlFor="filter-from" className={label}>Received from</label>
              <input id="filter-from" type="date" name="from" defaultValue={filters.from} className={dateField} />
            </div>
            <div>
              <label htmlFor="filter-to" className={label}>Received to</label>
              <input id="filter-to" type="date" name="to" defaultValue={filters.to} className={dateField} />
            </div>
            <div>
              <label htmlFor="filter-pickup-from" className={label}>Pickup from</label>
              <input id="filter-pickup-from" type="date" name="pickup_from" defaultValue={filters.pickupFrom} className={dateField} />
            </div>
            <div>
              <label htmlFor="filter-pickup-to" className={label}>Pickup to</label>
              <input id="filter-pickup-to" type="date" name="pickup_to" defaultValue={filters.pickupTo} className={dateField} />
            </div>
            <div>
              <label htmlFor="filter-origin" className={label}>From state</label>
              <select id="filter-origin" name="origin" defaultValue={filters.originState} className={selectField}>
                <option value="">Any state</option>
                {REGION_NAMES.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-destination" className={label}>To state</label>
              <select id="filter-destination" name="destination" defaultValue={filters.destinationState} className={selectField}>
                <option value="">Any state</option>
                {REGION_NAMES.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-load" className={label}>Load type</label>
              <select id="filter-load" name="load" defaultValue={filters.loadType === "ALL" ? "" : filters.loadType.toLowerCase()} className={selectField}>
                <option value="">Full and part loads</option>
                <option value="full_load">{LOAD_TYPE_LABELS.FULL_LOAD}</option>
                <option value="part_load">{LOAD_TYPE_LABELS.PART_LOAD}</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-quoted" className={label}>Price</label>
              <select id="filter-quoted" name="quoted" defaultValue={filters.quoted === "ANY" ? "" : filters.quoted.toLowerCase()} className={selectField}>
                <option value="">Quoted or not</option>
                <option value="yes">Quoted</option>
                <option value="no">Not quoted yet</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-sort" className={label}>Sort by</label>
              <select id="filter-sort" name="sort" defaultValue={filters.sort} className={selectField}>
                {SORT_IDS.map((sort) => (
                  <option key={sort} value={sort}>{SORT_LABELS[sort]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-3 lg:justify-end">
              <button type="submit" className={primaryButton}>
                Apply filters
              </button>
            </div>
          </div>
        </details>
      </Form>

      {chips.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.label}>
              <Link
                href={`/admin${inboxQuery({ ...filters, ...chip.clear, page: 1 })}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-frost-300 bg-white pr-2 pl-3 text-xs font-medium text-ink-700 hover:border-ink-400"
              >
                {chip.label}
                <X aria-label={`Remove filter ${chip.label}`} className="size-3.5 text-ink-500" />
              </Link>
            </li>
          ))}
          {chips.length > 1 ? (
            <li>
              <Link
                href={`/admin${inboxQuery({ ...DEFAULT_INBOX_FILTERS, status: filters.status, view: filters.view })}`}
                className="inline-flex h-8 items-center rounded-full px-3 text-xs font-medium text-ink-500 hover:text-navy-900"
              >
                Clear all
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}
    </>
  );
}

async function Inbox({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const filters = parseInboxFilters(await searchParams);
  if (filters.view === "board") return <Board filters={filters} />;

  const [{ rows, total, pageCount, counts, values }, { bands }] = await Promise.all([
    listQuoteRequests(filters),
    getSiteContent(),
  ]);

  const firstShown = (filters.page - 1) * INBOX_PAGE_SIZE + 1;
  const page = (number: number) => `/admin${inboxQuery({ ...filters, page: number })}`;

  return (
    <div className="space-y-6">
      <Header filters={filters} />
      <Pipeline filters={filters} counts={counts} values={values} />
      <Filters filters={filters} bands={bands} />

      <div className={cn(card, "overflow-hidden")}>
        {rows.length === 0 ? (
          <EmptyState filters={filters} />
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
                <RequestRow key={row.id} row={row} bands={bands} />
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

async function Board({ filters }: { filters: InboxFilters }) {
  const [{ columns, counts, values, placedKg, readAt }, { bands }] = await Promise.all([listBoard(filters), getSiteContent()]);
  const bandLabels = Object.fromEntries(MATERIAL_IDS.map((id) => [id, bands[id].label])) as Record<MaterialId, string>;
  const listHref = Object.fromEntries(
    BOARD_STAGES.map((stage) => [stage, `/admin${inboxQuery({ ...filters, view: "list", status: stage, page: 1 })}`]),
  ) as Record<BoardStage, string>;

  return (
    <div className="space-y-6">
      <Header filters={filters} />
      <Pipeline filters={filters} counts={counts} values={values} />
      <Filters filters={filters} bands={bands} />
      <PipelineBoard
        // Fresh state whenever the server sends new data, e.g. after a filter changes.
        key={inboxQuery(filters)}
        stages={BOARD_STAGES}
        columns={columns}
        counts={counts}
        values={values}
        placedKg={placedKg}
        bandLabels={bandLabels}
        now={readAt}
        listHref={listHref}
      />
    </div>
  );
}

export default function InboxPage({ searchParams }: PageProps<"/admin">) {
  return <Inbox searchParams={searchParams} />;
}
