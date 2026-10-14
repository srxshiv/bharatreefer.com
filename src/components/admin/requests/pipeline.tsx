import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { StatusCounts, StatusValues } from "@/features/quotes/admin";
import { inboxQuery, type InboxFilters } from "@/features/quotes/filters";
import { STATUS_LABELS, type QuoteStatusId } from "@/features/quotes/status";
import { cn } from "@/lib/cn";
import { formatInrShort } from "@/lib/format";
import { PendingHint } from "../pending-hint";
import { STAGE_ACCENT } from "./stage-styles";

const FLOW = ["NEW", "CONTACTED", "QUOTED", "CONFIRMED", "COMPLETED"] as const satisfies readonly QuoteStatusId[];
const PRICED = new Set<QuoteStatusId>(["QUOTED", "CONFIRMED", "COMPLETED"]);

/**
 * The pipeline at a glance: how many requests sit at each stage and what the quoted ones
 * are worth. In the list each stage filters it; on the board each jumps to its column.
 */
export function Pipeline({
  filters,
  counts,
  values,
}: {
  filters: InboxFilters;
  counts: StatusCounts;
  values: StatusValues;
}) {
  const board = filters.view === "board";
  const busiest = Math.max(1, ...FLOW.map((stage) => counts[stage]));
  const won = counts.CONFIRMED + counts.COMPLETED;
  const decided = won + counts.LOST;

  return (
    <div className="space-y-3">
      <nav aria-label="Pipeline" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <ol className="grid min-w-[40rem] grid-cols-5 gap-2">
          {FLOW.map((stage, index) => {
            const active = !board && filters.status === stage;
            return (
              <li key={stage} className="relative">
                <Link
                  href={board && stage !== "COMPLETED" ? `#stage-${stage.toLowerCase()}` : `/admin${inboxQuery({ ...filters, view: "list", status: stage, page: 1 })}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative block rounded-xl border bg-white px-3.5 py-3 transition-[border-color,box-shadow]",
                    active ? "border-navy-900 shadow-sm ring-1 ring-navy-900" : "border-frost-200 hover:border-ink-300",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                    <span aria-hidden="true" className={cn("size-2 rounded-full", STAGE_ACCENT[stage])} />
                    {STATUS_LABELS[stage]}
                  </span>
                  <span className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-2xl font-semibold text-ink-950">{counts[stage]}</span>
                    {PRICED.has(stage) && values[stage] > 0 ? (
                      <span className="truncate font-mono text-xs text-ink-500">{formatInrShort(values[stage])}</span>
                    ) : null}
                  </span>
                  <span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-frost-100">
                    <span
                      className={cn("block h-full w-(--w) rounded-full transition-[width] duration-500", STAGE_ACCENT[stage])}
                      style={{ "--w": `${(counts[stage] / busiest) * 100}%` } as CSSProperties}
                    />
                  </span>
                  <PendingHint />
                </Link>
                {index < FLOW.length - 1 ? (
                  <ChevronRight
                    aria-hidden="true"
                    className="absolute top-1/2 -right-2 z-10 size-3.5 -translate-y-1/2 rounded-full bg-frost-50 text-ink-400"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {board ? (
          <p className="text-sm text-ink-500">
            <span className="lg:hidden">Swipe across for each stage. Move a card with its buttons.</span>
            <span className="hidden lg:inline">Drag a card to another column, or use its buttons.</span>
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" aria-label="Other views">
            {(["ALL", "LOST", "SPAM"] as const).map((status) => {
              const active = filters.status === status;
              return (
                <li key={status}>
                  <Link
                    href={`/admin${inboxQuery({ ...filters, status, page: 1 })}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                      active ? "border-navy-900 bg-navy-900 text-white" : "border-frost-300 bg-white text-ink-700 hover:border-ink-400",
                    )}
                  >
                    {status === "ALL" ? "All" : STATUS_LABELS[status]}
                    <span className={cn("font-mono", active ? "text-ink-300" : "text-ink-500")}>{counts[status]}</span>
                    <PendingHint />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {decided > 0 ? (
          <p className="text-sm text-ink-500">
            Won <span className="font-mono font-semibold text-ink-950">{Math.round((won / decided) * 100)}%</span> of decided
            requests
            {values.CONFIRMED + values.COMPLETED > 0 ? (
              <>
                {" · "}
                <span className="font-mono font-semibold text-ink-950">{formatInrShort(values.CONFIRMED + values.COMPLETED)}</span> booked
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
