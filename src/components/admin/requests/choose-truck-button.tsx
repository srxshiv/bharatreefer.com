"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Truck } from "lucide-react";

/** Fired at the fleet board to open its truck picker for a request. */
export const CHOOSE_TRUCK_EVENT = "bharat:choose-truck";

/**
 * Opens the truck picker for a confirmed request. When the request is open in a panel over
 * the fleet board, the panel closes and the board's picker opens straight away; anywhere
 * else it goes to the fleet board, which opens the picker for it.
 */
export function ChooseTruckButton({ quoteId, label, className }: { quoteId: string; label: string; className?: string }) {
  const router = useRouter();

  function choose(event: React.MouseEvent<HTMLButtonElement>) {
    const board = document.getElementById("fleet-queue");
    const inPanel = event.currentTarget.closest("dialog") !== null;
    if (inPanel && board && board.offsetParent !== null) {
      router.back();
      // After the panel has closed and the board has focus again.
      setTimeout(() => window.dispatchEvent(new CustomEvent(CHOOSE_TRUCK_EVENT, { detail: quoteId })), 80);
    } else {
      router.push(`/desk/fleet?order=${encodeURIComponent(quoteId)}`);
    }
  }

  return (
    <button type="button" onClick={choose} className={className}>
      <Truck aria-hidden="true" className="size-4" />
      {label}
      <ArrowRight aria-hidden="true" className="size-4" />
    </button>
  );
}
