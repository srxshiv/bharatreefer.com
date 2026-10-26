import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewRequestForm } from "@/components/admin/requests/new-request-form";
import { requireUser } from "@/features/auth/session";
import { getSiteContent } from "@/features/content/data";

export const metadata: Metadata = {
  title: "New request",
};

// Renders complete on the server (one round trip): no skeleton flash.
export const instant = false;

/** Where staff and admins enter a request for a customer who called, messaged or came in. */
export default async function NewRequestPage() {
  const [user, { fleet, bands }] = await Promise.all([requireUser(), getSiteContent()]);
  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/desk"
        prefetch
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ice-700 hover:text-ink-950"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Quote requests
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-950">New request</h1>
        <p className="mt-1 text-sm text-ink-500">
          For a customer who called, sent a message or came in. It is handled like a request from the
          website: it starts as New, dispatch gets the usual alert, and it shows who entered it. Your
          promo code is filled in, so it counts as your customer; change or clear it if someone else
          brought them.
        </p>
      </div>
      <NewRequestForm fleet={fleet} bands={bands} promoCode={user.promoCode} />
    </div>
  );
}
