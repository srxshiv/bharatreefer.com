"use client";

import { useEffect, useId, useOptimistic, useRef, useState, useTransition, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, Ellipsis, Truck } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import type { MaterialId } from "@/config/materials";
import type { BoardStage, InboxRow, StatusCounts, StatusValues } from "@/features/quotes/admin";
import { moveQuoteStage } from "@/features/quotes/admin-actions";
import { QUOTE_STATUSES, STATUS_LABELS, type QuoteStatusId } from "@/features/quotes/status";
import { cn } from "@/lib/cn";
import { formatIsoDayMonth, toIsoDate } from "@/lib/dates";
import { formatInr, formatInrShort, formatKg } from "@/lib/format";
import { IntentLink } from "../intent-link";
import { STAGE_ACCENT } from "./stage-styles";

type Columns = Record<BoardStage, InboxRow[]>;
type BoardState = { columns: Columns; counts: StatusCounts; values: StatusValues };
type Move = { id: string; to: QuoteStatusId; quotedAmount?: number };
type Toast = { id: number; ok: boolean; text: string };

const DRAG_TYPE = "application/x-bharat-request";


/** The step each stage usually takes next. */
const NEXT: Record<BoardStage, { to: QuoteStatusId; label: string }> = {
  NEW: { to: "CONTACTED", label: "Mark contacted" },
  CONTACTED: { to: "QUOTED", label: "Send quote" },
  QUOTED: { to: "CONFIRMED", label: "Confirmed" },
  CONFIRMED: { to: "COMPLETED", label: "Delivered" },
};

function isBoardStage(status: QuoteStatusId, stages: readonly BoardStage[]): status is BoardStage {
  return (stages as readonly string[]).includes(status);
}

function applyMove(stages: readonly BoardStage[]) {
  return (state: BoardState, move: Move): BoardState => {
    const from = stages.find((stage) => state.columns[stage].some((row) => row.id === move.id));
    if (!from) return state;
    const row = state.columns[from].find((item) => item.id === move.id)!;
    const moved: InboxRow = {
      ...row,
      status: move.to,
      quotedAmount: move.quotedAmount === undefined ? row.quotedAmount : move.quotedAmount,
    };
    const columns = { ...state.columns, [from]: state.columns[from].filter((item) => item.id !== move.id) };
    if (isBoardStage(move.to, stages)) {
      columns[move.to] = from === move.to ? state.columns[from].map((item) => (item.id === move.id ? moved : item)) : [moved, ...columns[move.to]];
    }
    const counts = { ...state.counts, [from]: state.counts[from] - 1, [move.to]: state.counts[move.to] + 1 };
    const values = {
      ...state.values,
      [from]: state.values[from] - (row.quotedAmount ?? 0),
      [move.to]: state.values[move.to] + (moved.quotedAmount ?? 0),
    };
    return { columns, counts, values };
  };
}

function age(createdAt: Date, now: number): string {
  const minutes = Math.max(0, Math.round((now - createdAt.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

/** Whole rupees from what was typed, or null. Accepts "48,500", "₹ 48500". */
function parseRupees(text: string): number | null {
  const digits = text.replace(/[₹,\s]/g, "");
  if (!/^\d{1,8}$/.test(digits)) return null;
  const value = Number(digits);
  return value >= 1 && value <= 10_000_000 ? value : null;
}

export function PipelineBoard({
  stages,
  columns,
  counts,
  values,
  placedKg,
  bandLabels,
  now,
  listHref,
}: {
  stages: readonly BoardStage[];
  columns: Columns;
  counts: StatusCounts;
  values: StatusValues;
  placedKg: Record<string, number>;
  bandLabels: Record<MaterialId, string>;
  /** Server time, so ages match between server and browser. */
  now: number;
  /** The list view for a stage, with the current filters. */
  listHref: Record<BoardStage, string>;
}) {
  const [state, addMove] = useOptimistic({ columns, counts, values }, applyMove(stages));
  const [, startTransition] = useTransition();
  /** The card asking for a price before it moves, and where it is going. */
  const [askPrice, setAskPrice] = useState<{ id: string; to: QuoteStatusId } | null>(null);
  const [dropTarget, setDropTarget] = useState<BoardStage | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastCount = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.ok ? 3000 : 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  function move(row: InboxRow, to: QuoteStatusId, quotedAmount?: number) {
    setAskPrice(null);
    startTransition(async () => {
      addMove({ id: row.id, to, quotedAmount });
      let ok = false;
      let text: string;
      try {
        const result = await moveQuoteStage(row.id, to, quotedAmount);
        ok = Boolean(result.success);
        text = result.error ?? (to === row.status ? `${row.reference} saved.` : `${row.reference} moved to ${STATUS_LABELS[to]}.`);
      } catch {
        text = "Could not save. Check your connection and try again.";
      }
      toastCount.current += 1;
      setToast({ id: toastCount.current, ok, text });
    });
  }

  /** Moving to Quoted needs a price; ask for one in the card first if there is none. */
  function request(row: InboxRow, to: QuoteStatusId) {
    if (to === "QUOTED" && row.quotedAmount === null) setAskPrice({ id: row.id, to });
    else move(row, to);
  }

  function onDrop(event: DragEvent, stage: BoardStage) {
    event.preventDefault();
    setDropTarget(null);
    const id = event.dataTransfer.getData(DRAG_TYPE);
    const row = stages.flatMap((item) => state.columns[item]).find((item) => item.id === id);
    if (row && row.status !== stage) request(row, stage);
  }

  return (
    <>
      <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-3 sm:mx-0 sm:scroll-px-0 sm:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
        {stages.map((stage) => {
          const rows = state.columns[stage];
          const hidden = state.counts[stage] - rows.length;
          return (
            <section
              key={stage}
              id={`stage-${stage.toLowerCase()}`}
              aria-label={STATUS_LABELS[stage]}
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(stage);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
              }}
              onDrop={(event) => onDrop(event, stage)}
              className={cn(
                "flex w-[85vw] max-w-sm shrink-0 scroll-mt-24 snap-start flex-col rounded-2xl bg-frost-100/70 p-2 transition-colors sm:w-80 lg:w-auto lg:max-w-none",
                dropTarget === stage && "bg-ice-100 ring-2 ring-ice-400",
              )}
            >
              <header className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-2.5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-950">
                  <span aria-hidden="true" className={cn("size-2 rounded-full", STAGE_ACCENT[stage])} />
                  {STATUS_LABELS[stage]}
                  <span className="rounded-md bg-surface px-1.5 font-mono text-xs font-medium text-ink-500">{state.counts[stage]}</span>
                </h2>
                {state.values[stage] > 0 ? (
                  <span className="font-mono text-xs text-ink-500">{formatInrShort(state.values[stage])}</span>
                ) : null}
              </header>

              <ul className="flex min-h-24 flex-col gap-2 lg:max-h-[calc(100dvh-19rem)] lg:overflow-y-auto lg:overscroll-contain">
                {rows.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-frost-300 px-3 py-6 text-center text-xs text-ink-500">
                    Nothing here
                  </li>
                ) : (
                  rows.map((row) => (
                    <Card
                      key={row.id}
                      row={row}
                      stage={stage}
                      bandLabel={bandLabels[row.material]}
                      placedKg={placedKg[row.id] ?? 0}
                      now={now}
                      askingPrice={askPrice?.id === row.id}
                      onRequest={(to) => request(row, to)}
                      onPrice={(amount) => move(row, askPrice?.id === row.id ? askPrice.to : row.status, amount)}
                      onCancelPrice={() => setAskPrice(null)}
                    />
                  ))
                )}
              </ul>
              {hidden > 0 ? (
                <Link
                  href={listHref[stage]}
                  className="mt-2 inline-flex h-9 items-center justify-center gap-1 rounded-lg text-xs font-semibold text-ice-700 hover:bg-surface"
                >
                  {hidden} more in the list
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              ) : null}
            </section>
          );
        })}
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
            {toast.ok ? (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-leaf-50" />
            ) : (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            )}
            {toast.text}
          </p>
        ) : null}
      </div>
    </>
  );
}

function Card({
  row,
  stage,
  bandLabel,
  placedKg,
  now,
  askingPrice,
  onRequest,
  onPrice,
  onCancelPrice,
}: {
  row: InboxRow;
  stage: BoardStage;
  bandLabel: string;
  placedKg: number;
  now: number;
  askingPrice: boolean;
  onRequest: (to: QuoteStatusId) => void;
  onPrice: (amount: number) => void;
  onCancelPrice: () => void;
}) {
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const pending = row.status !== stage;
  const next = NEXT[stage];
  // A quoted request with no price saved yet asks for one in place.
  const needsPrice = askingPrice || (stage === "QUOTED" && row.quotedAmount === null && !pending);

  return (
    <li
      draggable={!needsPrice}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, row.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group relative rounded-xl border border-frost-200 bg-surface p-3.5 shadow-[0_1px_0_rgb(0_0_0/0.03)] transition-[box-shadow,border-color,opacity] duration-200 starting:opacity-0 hover:border-ink-300 hover:shadow-md",
        row.status === "NEW" && "shadow-[inset_3px_0_0_var(--color-ice-500)]",
        pending && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <IntentLink
          href={`/admin/quotes/${row.id}`}
          className="font-mono text-sm font-semibold text-ink-950 after:absolute after:inset-0 after:rounded-xl hover:text-ice-700"
        >
          {row.reference}
        </IntentLink>
        <span className="text-xs text-ink-500" title="Received">
          {age(row.createdAt, now)}
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-ink-950">{row.contactName}</p>
      <p className="mt-0.5 truncate text-sm text-ink-700">
        {row.originCity}
        <ArrowRight aria-label="to" className="mx-1 inline size-3.5 text-ink-400" />
        {row.destinationCity}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500">
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", BAND_STYLES[row.material].fill)} />
        <span className="truncate">
          {bandLabel} · {formatKg(row.quantityKg)}
          {row.pickupDate ? ` · pickup ${formatIsoDayMonth(toIsoDate(row.pickupDate))}` : ""}
        </span>
      </p>

      {row.quotedAmount !== null && !askingPrice ? (
        <p className="mt-2 font-mono text-base font-semibold text-ink-950">{formatInr(row.quotedAmount)}</p>
      ) : null}

      {stage === "CONFIRMED" && !pending ? (
        <Link
          href={`/admin/fleet?order=${row.id}`}
          className={cn(
            "relative z-10 mt-2 inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold",
            placedKg >= row.quantityKg ? "bg-success-soft text-success" : "bg-saffron-50 text-saffron-600 hover:bg-saffron-50/70",
          )}
        >
          <Truck aria-hidden="true" className="size-3.5" />
          {placedKg >= row.quantityKg ? "On trucks" : placedKg > 0 ? `${formatKg(row.quantityKg - placedKg)} needs a truck` : "Needs a truck"}
        </Link>
      ) : null}

      {needsPrice ? (
        <PriceForm
          initial={row.quotedAmount}
          label={stage === "QUOTED" ? "Save price" : "Send quote"}
          onSubmit={onPrice}
          onCancel={askingPrice ? onCancelPrice : undefined}
        />
      ) : (
        <div className="relative z-10 mt-3 flex items-center gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={() => onRequest(next.to)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-frost-300 bg-surface text-xs font-semibold text-ink-950 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white disabled:opacity-50"
          >
            {next.label}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </button>
          <button
            type="button"
            popoverTarget={menuId}
            disabled={pending}
            onClick={(event) => {
              // Place the menu under the button: popovers open in the top layer, outside the column.
              const rect = event.currentTarget.getBoundingClientRect();
              const element = menu.current;
              if (!element) return;
              // Below the button, or above it when the window has no room underneath.
              const height = 36 * (QUOTE_STATUSES.length - 1) + 40;
              const below = rect.bottom + 4;
              element.style.top = `${below + height > window.innerHeight ? Math.max(8, rect.top - height - 4) : below}px`;
              element.style.left = `${Math.max(8, rect.right - 192)}px`;
            }}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-frost-300 bg-surface text-ink-500 transition-colors hover:border-ink-400 hover:text-ink-950 disabled:opacity-50"
          >
            <Ellipsis aria-hidden="true" className="size-4" />
            <span className="sr-only">More moves for {row.reference}</span>
          </button>
          <div
            ref={menu}
            id={menuId}
            popover="auto"
            className="fixed m-0 w-48 rounded-xl border border-frost-200 bg-surface p-1 text-sm shadow-xl"
          >
            <p className="px-2.5 pt-1.5 pb-1 text-xs text-ink-500">Move to</p>
            {QUOTE_STATUSES.filter((status) => status !== row.status).map((status) => (
              <button
                key={status}
                type="button"
                popoverTarget={menuId}
                popoverTargetAction="hide"
                onClick={() => onRequest(status)}
                className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-ink-900 hover:bg-frost-100"
              >
                <span aria-hidden="true" className={cn("size-2 rounded-full", STAGE_ACCENT[status])} />
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

function PriceForm({
  initial,
  label,
  onSubmit,
  onCancel,
}: {
  initial: number | null;
  label: string;
  onSubmit: (amount: number) => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [error, setError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseRupees(String(new FormData(event.currentTarget).get("amount") ?? ""));
    if (amount === null) {
      setError(true);
      return;
    }
    onSubmit(amount);
  }

  return (
    <form onSubmit={handleSubmit} className="relative z-10 mt-3 space-y-2">
      <label htmlFor={id} className="block text-xs font-medium text-ink-700">
        Price quoted to the customer
      </label>
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center font-mono text-sm text-ink-500">₹</span>
          <input
            id={id}
            name="amount"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            defaultValue={initial ?? ""}
            placeholder="48,500"
            aria-invalid={error || undefined}
            onChange={() => setError(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && onCancel) onCancel();
            }}
            className={cn(
              "h-9 w-full rounded-lg border bg-surface pr-2 pl-6 font-mono text-sm text-ink-950 focus:ring-2 focus:ring-ice-400/50 focus:outline-none",
              error ? "border-danger" : "border-frost-300 focus:border-ink-900",
            )}
          />
        </div>
        <button type="submit" className="h-9 rounded-lg bg-navy-900 px-3 text-xs font-semibold text-white hover:bg-navy-800">
          {label}
        </button>
      </div>
      {error ? <p className="text-xs text-danger">Enter the price in whole rupees.</p> : null}
      {onCancel ? (
        <button type="button" onClick={onCancel} className="text-xs font-medium text-ink-500 hover:text-ink-950">
          Cancel
        </button>
      ) : null}
    </form>
  );
}
