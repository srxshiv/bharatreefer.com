import type { Metadata } from "next";
import Link from "next/link";
import { Columns3, Download, List, Search, X } from "lucide-react";
import { IntentLink } from "@/components/admin/intent-link";
import { PendingHint } from "@/components/admin/pending-hint";
import { PipelineBoard } from "@/components/admin/requests/board";
import { FilterForm, FilterResults, FilterScope } from "@/components/admin/requests/filter-form";
import { FilterPanel } from "@/components/admin/requests/filter-panel";
import { Pagination } from "@/components/admin/requests/pagination";
import { RequestTable } from "@/components/admin/requests/request-table";
import { Pipeline } from "@/components/admin/requests/pipeline";
import { input, label, primaryButton, secondaryButton } from "@/components/admin/ui";
import { MATERIAL_IDS, type MaterialId, type TemperatureBandInfo } from "@/config/materials";
import { REGION_NAMES } from "@/data/india-locations";
import { getSiteContent } from "@/features/content/data";
import { BOARD_STAGES, listBoard, listQuoteRequests, type BoardStage } from "@/features/quotes/admin";
import {
  ADVANCED_FILTER_KEYS,
  DEFAULT_INBOX_FILTERS,
  SORT_IDS,
  SORT_LABELS,
  inboxQuery,
  isFiltered,
  parseInboxFilters,
  type InboxFilters,
} from "@/features/quotes/filters";
import { cn } from "@/lib/cn";
import { formatIsoDate } from "@/lib/dates";
import { LOAD_TYPE_LABELS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Quote requests",
};

// Renders complete on the server (one round trip, about 0.2 s): no skeleton flash. The
// progress bar at the top of the panel shows a click was registered.
export const instant = false;

function Header({ filters }: { filters: InboxFilters }) {
  const views = [
    { id: "list", label: "List", icon: List, href: `/admin${inboxQuery({ ...filters, view: "list" })}` },
    { id: "board", label: "Board", icon: Columns3, href: `/admin${inboxQuery({ ...filters, view: "board", status: "ALL", page: 1 })}` },
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold tracking-tight text-ink-950">Quote requests</h1>
      <div className="flex items-center gap-2">
        <nav aria-label="View" className="flex rounded-lg bg-frost-100 p-0.5">
          {views.map((view) => {
            const active = filters.view === view.id;
            const Icon = view.icon;
            return (
              <Link
                key={view.id}
                href={view.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-all",
                  active ? "bg-surface text-ink-950 shadow-sm dark:bg-frost-300" : "text-ink-500 hover:text-ink-950",
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
        <a href={`/admin/export${inboxQuery({ ...filters, view: "list", page: 1 })}`} className={cn(secondaryButton, "h-9")}>
          <Download aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sr-only sm:hidden">Export CSV</span>
        </a>
      </div>
    </div>
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

const selectField = cn(input, "mt-1 h-10");
const dateField = cn(input, "mt-1 h-10 font-mono");

/** Search, temperature and the filter panel in one row, with the active filters beneath. */
function Filters({ filters, bands }: { filters: InboxFilters; bands: Record<MaterialId, TemperatureBandInfo> }) {
  const chips = activeChips(filters, bands);
  const advancedCount = ADVANCED_FILTER_KEYS.filter((key) => filters[key] !== DEFAULT_INBOX_FILTERS[key]).length;
  const advancedReset = Object.fromEntries(ADVANCED_FILTER_KEYS.map((key) => [key, DEFAULT_INBOX_FILTERS[key]]));

  return (
    <div className="space-y-2">
      {/* Keyed on the filters so the fields reset when a link changes them. */}
      <FilterForm key={inboxQuery(filters)} action="/admin" className="flex flex-wrap items-center gap-2">
        {filters.status !== "ALL" && filters.view === "list" ? (
          <input type="hidden" name="status" value={filters.status.toLowerCase()} />
        ) : null}
        {filters.view === "board" ? <input type="hidden" name="view" value="board" /> : null}
        {filters.size !== DEFAULT_INBOX_FILTERS.size ? <input type="hidden" name="size" value={filters.size} /> : null}
        <div className="relative min-w-[12rem] flex-1 basis-full sm:basis-auto">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500" />
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            aria-label="Search requests"
            placeholder="Search reference, name, phone or city"
            maxLength={100}
            className={cn(input, "h-10 pl-9")}
          />
        </div>
        <select
          name="material"
          data-apply
          defaultValue={filters.material === "ALL" ? "" : filters.material.toLowerCase()}
          aria-label="Temperature band"
          className={cn(input, "h-10 min-w-0 flex-1 sm:w-48 sm:flex-none")}
        >
          <option value="">All temperatures</option>
          {MATERIAL_IDS.map((id) => (
            <option key={id} value={id.toLowerCase()}>
              {bands[id].label}
            </option>
          ))}
        </select>
        <FilterPanel activeCount={advancedCount} resetHref={`/admin${inboxQuery({ ...filters, ...advancedReset, page: 1 })}`}>
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className={label}>Received from</span>
              <input type="date" name="from" defaultValue={filters.from} className={dateField} />
            </label>
            <label className="block">
              <span className={label}>Received to</span>
              <input type="date" name="to" defaultValue={filters.to} className={dateField} />
            </label>
            <label className="block">
              <span className={label}>Sort by</span>
              {/* Newest first is the default, so it sends nothing and stays out of the address. */}
              <select name="sort" defaultValue={filters.sort === "newest" ? "" : filters.sort} className={selectField}>
                {SORT_IDS.map((sort) => (
                  <option key={sort} value={sort === "newest" ? "" : sort}>
                    {SORT_LABELS[sort]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Pickup from</span>
              <input type="date" name="pickup_from" defaultValue={filters.pickupFrom} className={dateField} />
            </label>
            <label className="block">
              <span className={label}>Pickup to</span>
              <input type="date" name="pickup_to" defaultValue={filters.pickupTo} className={dateField} />
            </label>
            <label className="block">
              <span className={label}>Load type</span>
              <select name="load" defaultValue={filters.loadType === "ALL" ? "" : filters.loadType.toLowerCase()} className={selectField}>
                <option value="">Full and part loads</option>
                <option value="full_load">{LOAD_TYPE_LABELS.FULL_LOAD}</option>
                <option value="part_load">{LOAD_TYPE_LABELS.PART_LOAD}</option>
              </select>
            </label>
            <label className="block">
              <span className={label}>From state</span>
              <select name="origin" defaultValue={filters.originState} className={selectField}>
                <option value="">Any state</option>
                {REGION_NAMES.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>To state</span>
              <select name="destination" defaultValue={filters.destinationState} className={selectField}>
                <option value="">Any state</option>
                {REGION_NAMES.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Price</span>
              <select name="quoted" defaultValue={filters.quoted === "ANY" ? "" : filters.quoted.toLowerCase()} className={selectField}>
                <option value="">Quoted or not</option>
                <option value="yes">Quoted</option>
                <option value="no">Not quoted yet</option>
              </select>
            </label>
          </div>
        </FilterPanel>
        <button type="submit" className={cn(primaryButton, "h-10")}>
          Search
        </button>
      </FilterForm>

      {chips.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.label}>
              <IntentLink
                href={`/admin${inboxQuery({ ...filters, ...chip.clear, page: 1 })}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-frost-300 bg-surface pr-2 pl-3 text-xs font-medium text-ink-700 hover:border-ink-400"
              >
                {chip.label}
                <X aria-label={`Remove filter ${chip.label}`} className="size-3.5 text-ink-500" />
              </IntentLink>
            </li>
          ))}
          <li>
            <IntentLink
              href={`/admin${inboxQuery({ ...DEFAULT_INBOX_FILTERS, status: filters.status, view: filters.view, size: filters.size })}`}
              className="inline-flex h-7 items-center rounded-full px-2 text-xs font-medium text-ink-500 hover:text-ink-950"
            >
              Clear all
            </IntentLink>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

async function Inbox({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const filters = parseInboxFilters(await searchParams);
  if (filters.view === "board") return <Board filters={filters} />;

  const [{ rows, total, pageCount, counts, values }, { bands }] = await Promise.all([
    listQuoteRequests(filters),
    getSiteContent(),
  ]);
  const bandLabels = Object.fromEntries(MATERIAL_IDS.map((id) => [id, bands[id].label])) as Record<MaterialId, string>;

  return (
    <div className="space-y-4">
      <Header filters={filters} />
      <Pipeline filters={filters} counts={counts} values={values} />
      <FilterScope>
        <Filters filters={filters} bands={bands} />
        <FilterResults className="space-y-3">
          <RequestTable key={inboxQuery(filters)} rows={rows} bandLabels={bandLabels} empty={<EmptyState filters={filters} />} />
          <Pagination filters={filters} total={total} pageCount={pageCount} shown={rows.length} />
        </FilterResults>
      </FilterScope>
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
    <div className="space-y-4">
      <Header filters={filters} />
      <Pipeline filters={filters} counts={counts} values={values} />
      <FilterScope>
      <Filters filters={filters} bands={bands} />
      <FilterResults>
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
      </FilterResults>
      </FilterScope>
    </div>
  );
}

export default function InboxPage({ searchParams }: PageProps<"/admin">) {
  return <Inbox searchParams={searchParams} />;
}
