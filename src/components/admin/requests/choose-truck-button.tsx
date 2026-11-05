"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Truck } from "lucide-react";

/** Fired at the fleet board to open its truck picker for a request. */
export const CHOOSE_TRUCK_EVENT = "bharat:choose-truck";

/**
 * Opens the truck picker for a quoted request. When the request is open in a panel over
 * the fleet board, the panel closes and the board's picker opens straight away; anywhere
 * else it goes to the fleet board, which opens the picker for it.
 */
export function ChooseTruckButton({ quoteId, label, className }: { quoteId: string; label: string; className?: string }) {
  const router = useRouter();
  // The fleet page takes a moment to load; the button says so meanwhile.
  const [pending, startTransition] = useTransition();

  function choose(event: React.MouseEvent<HTMLButtonElement>) {
    const board = document.getElementById("fleet-queue");
    const inPanel = event.currentTarget.closest("dialog") !== null;
    if (inPanel && board && board.offsetParent !== null) {
      router.back();
      // After the panel has closed and the board has focus again.
      setTimeout(() => window.dispatchEvent(new CustomEvent(CHOOSE_TRUCK_EVENT, { detail: quoteId })), 80);
    } else {
      startTransition(() => router.push(`/desk/fleet?order=${encodeURIComponent(quoteId)}`));
    }
  }

  return (
    <button type="button" onClick={choose} disabled={pending} aria-busy={pending} className={className}>
      {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Truck aria-hidden="true" className="size-4" />}
      {pending ? "Opening the fleet" : label}
      {pending ? null : <ArrowRight aria-hidden="true" className="size-4" />}
    </button>
  );
}
