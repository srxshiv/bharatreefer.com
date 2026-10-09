import { STATUS_LABELS, type QuoteStatusId } from "@/features/quotes/status";
import { cn } from "@/lib/cn";

const STYLES: Record<QuoteStatusId, string> = {
  NEW: "bg-ink-950 text-white",
  CONTACTED: "bg-frost-200 text-ink-900",
  QUOTED: "bg-chilled-soft text-ice-700",
  CONFIRMED: "bg-success-soft text-success",
  COMPLETED: "border border-frost-300 text-ink-600",
  LOST: "bg-frost-100 text-ink-600",
  SPAM: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: QuoteStatusId }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold whitespace-nowrap",
        STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
