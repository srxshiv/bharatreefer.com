import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuoteView } from "@/components/admin/requests/quote-view";

export const metadata: Metadata = {
  title: "Quote request",
};

// Renders complete on the server (one round trip): no skeleton flash.
export const instant = false;

/**
 * A request as a full page: what opens from a shared link or a reload. Opened from another
 * admin page, the same view shows in a side panel instead (see @modal/(.)quotes/[id]).
 */
export default async function QuotePage({ params }: PageProps<"/admin/quotes/[id]">) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        prefetch
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ice-700 hover:text-ink-950"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Quote requests
      </Link>
      <QuoteView id={id} />
    </div>
  );
}
