import type { StatusCounts, StatusValues } from "@/features/quotes/admin";
import { inboxQuery, type InboxFilters } from "@/features/quotes/filters";
import { STATUS_LABELS, type QuoteStatusId } from "@/features/quotes/status";
import { cn } from "@/lib/cn";
import { formatInrShort } from "@/lib/format";
import { IntentLink } from "../intent-link";
import { PendingHint } from "../pending-hint";
import { STAGE_ACCENT } from "./stage-styles";

const FLOW = ["NEW", "CONTACTED", "QUOTED", "CONFIRMED", "COMPLETED"] as const satisfies readonly QuoteStatusId[];
const OTHERS = ["ALL", "LOST", "SPAM"] as const;
const PRICED = new Set<QuoteStatusId>(["QUOTED", "CONFIRMED", "COMPLETED"]);

/**
 * The pipeline in one slim row: how many requests sit at each stage and what the quoted ones
 * are worth. In the list each stage filters it; on the board each jumps to its column.
 */
export function Pipeline({ filters, counts, values }: { filters: InboxFilters; counts: StatusCounts; values: StatusValues }) {
  const board = filters.view === "board";
  const won = counts.CONFIRMED + counts.COMPLETED;
  const decided = won + counts.LOST;

  const chip = (active: boolean) =>
    cn(
      "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition-colors",
      active ? "border-navy-900 bg-navy-900 text-white" : "border-frost-200 bg-surface text-ink-700 hover:border-ink-300",
    );

  return (
    <div className="flex items-center gap-4">
      <nav aria-label="Pipeline" className="-mx-5 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-5 pb-0.5 sm:mx-0 sm:px-0">
        {FLOW.map((stage) => {
          const active = !board && filters.status === stage;
          return (
            <IntentLink
              key={stage}
              href={
                board && stage !== "COMPLETED"
                  ? `#stage-${stage.toLowerCase()}`
                  : `/desk${inboxQuery({ ...filters, view: "list", status: stage, page: 1 })}`
              }
              aria-current={active ? "page" : undefined}
              className={chip(active)}
            >
              <span aria-hidden="true" className={cn("size-2 rounded-full", STAGE_ACCENT[stage])} />
              <span className="font-medium">{STATUS_LABELS[stage]}</span>
              <span className={cn("font-mono font-semibold", active ? "text-white" : "text-ink-950")}>{counts[stage]}</span>
              {PRICED.has(stage) && values[stage] > 0 ? (
                <span className={cn("font-mono text-xs", active ? "text-white/70" : "text-ink-500")}>{formatInrShort(values[stage])}</span>
              ) : null}
              <PendingHint />
            </IntentLink>
          );
        })}
        {board ? null : (
          <>
            <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-frost-300" />
            {OTHERS.map((status) => {
              const active = filters.status === status;
              return (
                <IntentLink
                  key={status}
                  href={`/desk${inboxQuery({ ...filters, status, page: 1 })}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(chip(active), "px-2")}
                >
                  <span className="font-medium">{status === "ALL" ? "All" : STATUS_LABELS[status]}</span>
                  <span className={cn("font-mono", active ? "text-white/70" : "text-ink-500")}>{counts[status]}</span>
                  <PendingHint />
                </IntentLink>
              );
            })}
          </>
        )}
      </nav>
      {decided > 0 ? (
        <p className="hidden shrink-0 text-xs text-ink-500 2xl:block">
          Won <span className="font-mono font-semibold text-ink-950">{Math.round((won / decided) * 100)}%</span>
          {values.CONFIRMED + values.COMPLETED > 0 ? (
            <>
              {" · "}
              <span className="font-mono font-semibold text-ink-950">{formatInrShort(values.CONFIRMED + values.COMPLETED)}</span> booked
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
