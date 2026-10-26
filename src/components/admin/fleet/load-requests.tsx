"use client";

import { Check, X } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import type { MaterialId } from "@/config/materials";
import type { FleetLoadRequest, FleetTruck } from "@/features/fleet/types";
import { cn } from "@/lib/cn";
import { formatShortDateTimeInIndia } from "@/lib/dates";
import { formatKg } from "@/lib/format";
import { IntentLink } from "../intent-link";
import { card } from "../ui";
import { NumberPlate } from "./number-plate";

const smallButton =
  "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40";

const DECIDED_LABELS: Record<Exclude<FleetLoadRequest["status"], "PENDING">, { text: string; tone: string }> = {
  APPROVED: { text: "Approved", tone: "bg-success-soft text-success" },
  DECLINED: { text: "Declined", tone: "bg-danger-soft text-danger" },
  CANCELLED: { text: "Withdrawn", tone: "bg-frost-100 text-ink-600" },
};

/**
 * Staff asking for a load to go on a truck. Admins see every ask waiting, with what the truck
 * would carry if they approve it, and approve or decline. Staff see their own asks, can
 * withdraw one still waiting, and see how the last week's were decided.
 */
export function LoadRequests({
  requests,
  trucks,
  canManage,
  bandLabels,
  onApprove,
  onDecline,
  onCancel,
}: {
  requests: FleetLoadRequest[];
  trucks: FleetTruck[];
  canManage: boolean;
  bandLabels: Record<MaterialId, string>;
  onApprove: (request: FleetLoadRequest) => void;
  onDecline: (request: FleetLoadRequest) => void;
  onCancel: (request: FleetLoadRequest) => void;
}) {
  if (requests.length === 0) return null;
  const pending = requests.filter((request) => request.status === "PENDING").length;

  return (
    <section aria-labelledby="fleet-load-requests" className={cn(card, "p-4", pending > 0 && "border-ice-300 bg-ice-50/40")}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="fleet-load-requests" className="font-semibold text-ink-950">
          {canManage ? "Truck requests" : "Your truck requests"}
        </h2>
        {pending > 0 ? <span className="font-mono text-sm text-ink-500">{pending} waiting</span> : null}
      </div>
      <p className="mt-1 text-xs text-ink-500">
        {canManage
          ? "Staff asking for a load to go on a truck. Approving puts it on."
          : "An admin approves each one before the load goes on the truck."}
      </p>

      <ul className="mt-3 divide-y divide-frost-200">
        {requests.map((request) => {
          const saving = request.id.startsWith("pending-");
          const truck = trucks.find((item) => item.id === request.truckId);
          const after = truck ? truck.usedKg + request.loadKg : null;
          const over = truck && after !== null ? after - truck.capacityKg : 0;
          return (
            <li key={request.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <IntentLink href={`/desk/quotes/${request.quoteId}`} className="font-mono text-sm font-semibold text-ink-950 hover:text-ice-700">
                  {request.reference}
                </IntentLink>
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-700">
                  <span aria-hidden="true" className={cn("size-2 rounded-full", BAND_STYLES[request.material].fill)} />
                  {formatKg(request.loadKg)} {bandLabels[request.material].toLowerCase()}
                </span>
                <span className="text-xs text-ink-500">on</span>
                <NumberPlate plate={request.plateNumber} />
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {canManage ? `${request.requestedBy ?? "Someone"}, ` : "Asked "}
                {formatShortDateTimeInIndia(new Date(request.createdAt))}
                {canManage && truck && request.status === "PENDING" ? (
                  over > 0 ? (
                    <span className="font-semibold text-danger"> · {formatKg(over)} over its payload</span>
                  ) : (
                    <span> · fits, {formatKg(-over)} free after</span>
                  )
                ) : null}
              </p>

              {request.status !== "PENDING" ? (
                <p className="mt-1.5 text-xs">
                  <span className={cn("inline-flex h-6 items-center rounded-md px-2 font-semibold", DECIDED_LABELS[request.status].tone)}>
                    {DECIDED_LABELS[request.status].text}
                  </span>
                  {request.decidedBy && request.status !== "CANCELLED" ? (
                    <span className="ml-1.5 text-ink-500">by {request.decidedBy}</span>
                  ) : null}
                </p>
              ) : canManage ? (
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onApprove(request)}
                    className={cn(smallButton, "bg-navy-900 text-white hover:bg-navy-800")}
                  >
                    <Check aria-hidden="true" className="size-3.5" />
                    Approve
                    <span className="sr-only"> {request.reference}</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onDecline(request)}
                    className={cn(smallButton, "text-ink-600 hover:bg-danger-soft hover:text-danger")}
                  >
                    <X aria-hidden="true" className="size-3.5" />
                    Decline
                    <span className="sr-only"> {request.reference}</span>
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-md bg-saffron-50 px-2 text-xs font-semibold text-saffron-600">
                    Waiting for approval
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onCancel(request)}
                    className={cn(smallButton, "h-6 px-1.5 text-ink-500 hover:text-ink-950")}
                  >
                    Withdraw
                    <span className="sr-only"> the ask for {request.reference}</span>
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
