import { Suspense } from "react";
import { RouteSheet } from "@/components/admin/route-sheet";
import { QuoteView } from "@/components/admin/requests/quote-view";
import { StatusBadge } from "@/components/admin/status-badge";
import { card } from "@/components/admin/ui";
import { getQuoteRequest } from "@/features/quotes/admin";
import { cn } from "@/lib/cn";
import { formatDateTimeInIndia } from "@/lib/dates";

type Params = PageProps<"/admin/quotes/[id]">["params"];

/**
 * A request opened from another admin page (a row, a board card, the fleet queue) shows in a
 * side panel over that page instead of navigating away. The panel opens at once and fills in
 * as the request loads (instantly when it was prefetched on hover). The address still
 * changes, so Back closes it and a reload shows the full page.
 */
export default function QuotePanel({ params }: PageProps<"/admin/quotes/[id]">) {
  return (
    <RouteSheet
      title={
        <Suspense fallback={<div className="h-7 w-40 animate-pulse rounded-md bg-frost-100" />}>
          <PanelTitle params={params} />
        </Suspense>
      }
    >
      <Suspense fallback={<PanelSkeleton />}>
        <PanelBody params={params} />
      </Suspense>
    </RouteSheet>
  );
}

async function PanelTitle({ params }: { params: Params }) {
  const { id } = await params;
  const quote = await getQuoteRequest(id);
  if (!quote) return <h2 className="text-lg font-semibold text-ink-950">Request not found</h2>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-xl font-semibold tracking-wide text-ink-950">{quote.reference}</h2>
        <StatusBadge status={quote.status} />
      </div>
      <p className="mt-0.5 text-xs text-ink-500">Received {formatDateTimeInIndia(quote.createdAt)}</p>
    </div>
  );
}

async function PanelBody({ params }: { params: Params }) {
  const { id } = await params;
  // Read once here so a missing request shows a message instead of a "not found" page.
  if (!(await getQuoteRequest(id))) return <p className="text-sm text-ink-500">This request no longer exists.</p>;
  return <QuoteView id={id} inPanel />;
}

function PanelSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6 md:grid-cols-[minmax(0,1fr)_21rem]">
      {[0, 1].map((column) => (
        <div key={column} className="space-y-6">
          {[0, 1].map((block) => (
            <div key={block} className={cn(card, "space-y-3 p-6")}>
              <div className="h-4 w-28 animate-pulse rounded bg-frost-100" />
              <div className="h-3 w-full animate-pulse rounded bg-frost-100" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-frost-100" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
