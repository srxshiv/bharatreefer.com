import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZES, inboxQuery, type InboxFilters } from "@/features/quotes/filters";
import { cn } from "@/lib/cn";
import { IntentLink } from "../intent-link";
import { PageSizeSelect } from "./page-size-select";

/** The page numbers worth showing: the first, the last, and the two either side of this one. */
function pageList(page: number, pageCount: number): Array<number | "gap"> {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount));
  const sorted = [...wanted].sort((a, b) => a - b);
  const list: Array<number | "gap"> = [];
  for (const [index, n] of sorted.entries()) {
    if (index > 0 && n - sorted[index - 1] > 1) list.push("gap");
    list.push(n);
  }
  return list;
}

const step = "inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors";

/** "26–50 of 65", rows per page, and page numbers with previous and next. */
export function Pagination({ filters, total, pageCount, shown }: { filters: InboxFilters; total: number; pageCount: number; shown: number }) {
  if (total === 0) return null;
  const first = (filters.page - 1) * filters.size + 1;
  const href = (page: number) => `/desk${inboxQuery({ ...filters, page })}`;
  const sizeHrefs = Object.fromEntries(PAGE_SIZES.map((size) => [size, `/desk${inboxQuery({ ...filters, size, page: 1 })}`]));

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
      <div className="flex items-center gap-3">
        <span>
          <span className="font-mono text-ink-950">
            {first}–{first + shown - 1}
          </span>{" "}
          of <span className="font-mono text-ink-950">{total}</span>
        </span>
        <PageSizeSelect value={filters.size} hrefs={sizeHrefs} />
      </div>
      {pageCount > 1 ? (
        <ul className="flex items-center gap-1">
          <li>
            {filters.page > 1 ? (
              <IntentLink href={href(filters.page - 1)} className={cn(step, "text-ink-700 hover:bg-frost-100")}>
                <ChevronLeft aria-hidden="true" className="size-4" />
                <span className="sr-only">Previous page</span>
              </IntentLink>
            ) : (
              <span className={cn(step, "text-ink-300")} aria-hidden="true">
                <ChevronLeft className="size-4" />
              </span>
            )}
          </li>
          {pageList(filters.page, pageCount).map((item, index) =>
            item === "gap" ? (
              <li key={`gap-${index}`} className="px-1 text-ink-400" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={item}>
                <IntentLink
                  href={href(item)}
                  aria-current={item === filters.page ? "page" : undefined}
                  className={cn(
                    step,
                    "font-mono",
                    item === filters.page ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-frost-100",
                  )}
                >
                  {item}
                </IntentLink>
              </li>
            ),
          )}
          <li>
            {filters.page < pageCount ? (
              <IntentLink href={href(filters.page + 1)} className={cn(step, "text-ink-700 hover:bg-frost-100")}>
                <ChevronRight aria-hidden="true" className="size-4" />
                <span className="sr-only">Next page</span>
              </IntentLink>
            ) : (
              <span className={cn(step, "text-ink-300")} aria-hidden="true">
                <ChevronRight className="size-4" />
              </span>
            )}
          </li>
        </ul>
      ) : null}
    </nav>
  );
}
