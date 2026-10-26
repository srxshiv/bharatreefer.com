"use client";

import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowRight, CircleAlert, CircleCheck, Download, Ellipsis, Phone, X } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import type { MaterialId } from "@/config/materials";
import type { InboxRow } from "@/features/quotes/admin";
import { bulkMoveQuoteStage } from "@/features/quotes/admin-actions";
import { QUOTE_STATUSES, STATUS_LABELS, type QuoteStatusId } from "@/features/quotes/status";
import { cn } from "@/lib/cn";
import { formatIsoDayMonth, formatShortDateTimeInIndia, toIsoDate } from "@/lib/dates";
import { formatInr, formatKg } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import { IntentLink } from "../intent-link";
import { StatusBadge } from "../status-badge";
import { card } from "../ui";
import { describeCreator, describeReferrer } from "./creator";
import { STAGE_ACCENT } from "./stage-styles";

/** Column widths shared by the header row and every row on wide screens. */
const COLUMNS =
  "lg:grid-cols-[1.25rem_8.5rem_minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1.15fr)_5.5rem_6.5rem_2rem] lg:gap-x-4";


type Toast = { id: number; ok: boolean; text: string };

/**
 * The request list: compact rows that open the request in a side panel, a menu on each row
 * for quick moves and calls, and tick boxes for changing or exporting several at once.
 */
export function RequestTable({
  rows,
  bandLabels,
  empty,
}: {
  rows: InboxRow[];
  bandLabels: Record<MaterialId, string>;
  /** Shown when there are no rows. */
  empty: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useOptimistic(
    new Map(rows.map((row) => [row.id, row.status])),
    (current, change: { ids: string[]; status: QuoteStatusId }) => {
      const next = new Map(current);
      for (const id of change.ids) next.set(id, change.status);
      return next;
    },
  );
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);
  const toastCount = useRef(0);
  const bulkId = useId();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.ok ? 3500 : 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function move(ids: string[], status: QuoteStatusId) {
    if (ids.length === 0) return;
    startTransition(async () => {
      setStatuses({ ids, status });
      let result: { error?: string; success?: string };
      try {
        result = await bulkMoveQuoteStage(ids, status);
      } catch {
        result = { error: "Could not save. Check your connection and try again." };
      }
      toastCount.current += 1;
      setToast({ id: toastCount.current, ok: !result.error, text: result.error ?? `${result.success} Now ${STATUS_LABELS[status]}.` });
      if (!result.error) setSelected(new Set());
    });
  }

  if (rows.length === 0) return <div className={cn(card, "overflow-hidden")}>{empty}</div>;

  return (
    <>
      <div className={cn(card, "overflow-hidden")}>
        {/* Header, or the bulk bar while rows are ticked. The header uses the rows' columns. */}
        <div
          className={cn(
            "grid min-h-11 grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-3 border-b border-frost-200 bg-frost-50 px-4 py-1.5",
            selected.size === 0 && COLUMNS,
          )}
        >
          <input
            type="checkbox"
            aria-label={allSelected ? "Untick every row" : "Tick every row on this page"}
            checked={allSelected}
            ref={(element) => {
              if (element) element.indeterminate = someSelected;
            }}
            onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
            className="size-4 shrink-0 rounded border-frost-300"
          />
          {selected.size > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <span className="font-semibold text-ink-950">{selected.size} selected</span>
              <span className="flex items-center gap-1.5">
                <label htmlFor={bulkId} className="text-ink-500">
                  Move to
                </label>
                <select
                  id={bulkId}
                  value=""
                  disabled={pending}
                  onChange={(event) => {
                    if (event.target.value) move([...selected], event.target.value as QuoteStatusId);
                  }}
                  className="h-8 rounded-md border border-frost-300 bg-surface px-2 text-sm text-ink-950"
                >
                  <option value="">Choose a stage</option>
                  {QUOTE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </span>
              <a
                href={`/desk/export?ids=${[...selected].join(",")}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-medium text-ice-700 hover:bg-ice-50"
              >
                <Download aria-hidden="true" className="size-4" />
                Export
              </a>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="ml-auto inline-flex h-8 items-center gap-1 rounded-md px-2 font-medium text-ink-500 hover:text-ink-950"
              >
                <X aria-hidden="true" className="size-4" />
                Clear
              </button>
            </div>
          ) : (
            <>
              <span className="caption text-ink-500">
                Request<span className="lg:hidden">s on this page</span>
              </span>
              <span aria-hidden="true" className="caption hidden text-ink-500 lg:block">Customer</span>
              <span aria-hidden="true" className="caption hidden text-ink-500 lg:block">Route</span>
              <span aria-hidden="true" className="caption hidden text-ink-500 lg:block">Cargo</span>
              <span aria-hidden="true" className="caption hidden text-right text-ink-500 lg:block">Quoted</span>
              <span aria-hidden="true" className="caption hidden text-ink-500 lg:block">Status</span>
              <span aria-hidden="true" className="hidden lg:block" />
            </>
          )}
        </div>

        <ul className="divide-y divide-frost-200">
          {rows.map((row) => {
            const status = statuses.get(row.id) ?? row.status;
            const checked = selected.has(row.id);
            return (
              <li
                key={row.id}
                className={cn(
                  "relative grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 transition-colors hover:bg-frost-50",
                  COLUMNS,
                  checked && "bg-ice-50 hover:bg-ice-50",
                  status === "NEW" && "shadow-[inset_3px_0_0_var(--color-ice-500)]",
                )}
              >
                <input
                  type="checkbox"
                  aria-label={`Tick ${row.reference}`}
                  checked={checked}
                  onChange={() => toggle(row.id)}
                  className="relative z-10 size-4 rounded border-frost-300"
                />
                <div className="min-w-0">
                  <IntentLink
                    href={`/desk/quotes/${row.id}`}
                    className="font-mono text-sm font-semibold text-ink-950 after:absolute after:inset-0 hover:text-ice-700"
                  >
                    {row.reference}
                  </IntentLink>
                  <p className="truncate text-xs text-ink-500">
                    {formatShortDateTimeInIndia(row.createdAt)}
                    {row.referrer ? (
                      <span title={`Brought by ${describeReferrer(row.referrer)}`}>
                        {" · "}
                        <span className="sr-only">brought by </span>
                        <span className="font-mono font-semibold text-ink-700">{row.referrer.promoCode}</span>
                      </span>
                    ) : row.createdBy ? (
                      <span title={`Entered by ${describeCreator(row.createdBy)}`}>
                        {" · "}
                        <span className="sr-only">entered by </span>
                        {row.createdBy.name.split(" ")[0]}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="col-start-2 row-start-2 min-w-0 lg:col-start-auto lg:row-start-auto">
                  <p className="truncate text-sm font-medium text-ink-950">{row.contactName}</p>
                  <p className="font-mono text-xs text-ink-500">{formatIndianMobile(row.phone)}</p>
                </div>
                <div className="col-start-2 min-w-0 lg:col-start-auto">
                  <p className="truncate text-sm text-ink-950">
                    {row.originCity}
                    <ArrowRight aria-label="to" className="mx-1 inline size-3.5 text-ink-400" />
                    {row.destinationCity}
                  </p>
                  <p className="hidden truncate text-xs text-ink-500 lg:block">
                    {row.originState} to {row.destinationState}
                  </p>
                </div>
                <div className="col-start-2 min-w-0 lg:col-start-auto">
                  <p className="flex items-center gap-1.5 truncate text-sm text-ink-950">
                    <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", BAND_STYLES[row.material].fill)} />
                    {bandLabels[row.material]}, {formatKg(row.quantityKg)}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {row.loadType === "PART_LOAD" ? "Part load" : "Full load"}
                    {row.pickupDate ? ` · pickup ${formatIsoDayMonth(toIsoDate(row.pickupDate))}` : ""}
                  </p>
                </div>
                <p className="col-start-2 font-mono text-sm font-semibold text-ink-950 lg:col-start-auto lg:text-right">
                  {row.quotedAmount === null ? (
                    <span className="font-normal text-ink-400">
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">Not quoted</span>
                    </span>
                  ) : (
                    formatInr(row.quotedAmount)
                  )}
                </p>
                <div className="col-start-3 row-start-1 justify-self-end lg:col-start-auto lg:row-start-auto lg:justify-self-start">
                  <StatusBadge status={status} />
                </div>
                <div className="relative z-10 col-start-3 row-start-2 justify-self-end lg:col-start-auto lg:row-start-auto">
                  <RowMenu row={row} status={status} onMove={(next) => move([row.id], next)} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
        {toast ? (
          <p
            key={toast.id}
            role={toast.ok ? "status" : "alert"}
            className={cn(
              "pointer-events-auto flex max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl transition duration-300 starting:translate-y-2 starting:opacity-0",
              toast.ok ? "bg-navy-950 ring-1 ring-white/10" : "bg-danger",
            )}
          >
            {toast.ok ? <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-leaf-50" /> : <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
            {toast.text}
          </p>
        ) : null}
      </div>
    </>
  );
}

/** Quick things to do with one request without opening it. */
function RowMenu({ row, status, onMove }: { row: InboxRow; status: QuoteStatusId; onMove: (status: QuoteStatusId) => void }) {
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  return (
    <>
      <button
        type="button"
        popoverTarget={menuId}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const element = menu.current;
          if (!element) return;
          const height = 36 * QUOTE_STATUSES.length + 96;
          const below = rect.bottom + 4;
          element.style.top = `${below + height > window.innerHeight ? Math.max(8, rect.top - height - 4) : below}px`;
          element.style.left = `${Math.max(8, rect.right - 208)}px`;
        }}
        className="inline-flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-frost-100 hover:text-ink-950"
      >
        <Ellipsis aria-hidden="true" className="size-4" />
        <span className="sr-only">More for {row.reference}</span>
      </button>
      <div ref={menu} id={menuId} popover="auto" className="fixed m-0 w-52 rounded-xl border border-frost-200 bg-surface p-1 text-sm text-ink-900 shadow-xl">
        <a href={`tel:${row.phone}`} className="flex h-9 items-center gap-2 rounded-lg px-2.5 hover:bg-frost-100">
          <Phone aria-hidden="true" className="size-4 text-ink-500" />
          Call {row.contactName.split(" ")[0]}
        </a>
        <p className="mt-1 border-t border-frost-200 px-2.5 pt-2 pb-1 text-xs text-ink-500">Move to</p>
        {QUOTE_STATUSES.filter((option) => option !== status).map((option) => (
          <button
            key={option}
            type="button"
            popoverTarget={menuId}
            popoverTargetAction="hide"
            onClick={() => onMove(option)}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left hover:bg-frost-100"
          >
            <span aria-hidden="true" className={cn("size-2 rounded-full", STAGE_ACCENT[option])} />
            {STATUS_LABELS[option]}
          </button>
        ))}
      </div>
    </>
  );
}
