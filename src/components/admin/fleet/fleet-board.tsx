"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition, type CSSProperties, type DragEvent } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, Plus, Sparkles, Truck, Wrench, X } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import { MATERIAL_IDS, type MaterialId } from "@/config/materials";
import {
  addVehicleAction,
  assignLoadAction,
  autoAssignLoadAction,
  setVehicleStatusAction,
  unassignLoadAction,
} from "@/features/fleet/actions";
import {
  applyChange,
  asTruckLoad,
  groupTrucks,
  placeableKg,
  remainingKg,
  summarise,
  type BoardChange,
  type CapacityGroup,
} from "@/features/fleet/board-state";
import { blockedReason, rankTrucks } from "@/features/fleet/capacity";
import type { FleetBoard as Board, FleetOutcome, FleetTruck, WaitingOrder } from "@/features/fleet/types";
import { cn } from "@/lib/cn";
import { formatIsoDate } from "@/lib/dates";
import { formatCapacity, formatKg } from "@/lib/format";
import { Sheet } from "../sheet";
import { card, primaryButton } from "../ui";
import { NumberPlate } from "./number-plate";
import { TruckForm } from "./truck-form";
import { TruckGraphic } from "./truck-graphic";
import { TruckSheetBody, TruckSheetTitle } from "./truck-sheet";

type Bands = Record<MaterialId, { label: string; range: string }>;
type Toast = { id: number; outcome: FleetOutcome };
type SheetState = { kind: "truck"; id: string } | { kind: "add"; capacityKg?: number } | null;

const DRAG_TYPE = "application/x-bharat-order";

export function FleetBoard({
  board,
  bands,
  today,
  initialOrderId,
}: {
  board: Board;
  bands: Bands;
  /** India date, "YYYY-MM-DD", for flagging close pickups. */
  today: string;
  initialOrderId?: string;
}) {
  const [view, addChange] = useOptimistic(board, applyChange);
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(initialOrderId ?? null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastCount = useRef(0);

  const selected = view.waiting.find((order) => order.id === selectedId) ?? null;
  const summary = summarise(view);
  const groups = groupTrucks(view);
  const largest = Math.max(1, ...groups.map((group) => group.capacityKg));
  const bestId = selected
    ? rankTrucks(view.trucks.map(asTruckLoad), selected.material, remainingKg(selected))[0]?.id
    : undefined;
  const sheetTruck = sheet?.kind === "truck" ? view.trucks.find((truck) => truck.id === sheet.id) : undefined;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.outcome.ok ? 3500 : 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) setSelectedId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  /** Opens a sheet without carrying over the message from before. */
  function openSheet(next: SheetState) {
    setToast(null);
    setSheet(next);
  }

  function notify(outcome: FleetOutcome) {
    toastCount.current += 1;
    setToast({ id: toastCount.current, outcome });
  }

  /** Shows the change at once, then saves it. The page refreshes from the server afterwards. */
  function run(change: BoardChange, action: () => Promise<FleetOutcome>) {
    startTransition(async () => {
      addChange(change);
      try {
        notify(await action());
      } catch {
        notify({ ok: false, error: "Could not save. Check your connection and try again." });
      }
    });
  }

  function placeOn(truck: FleetTruck, order: WaitingOrder | null = selected) {
    if (!order) return;
    if (blockedReason(asTruckLoad(truck), order.material)) return;
    run({ kind: "assign", quoteId: order.id, truckId: truck.id }, () => assignLoadAction(order.id, truck.id));
  }

  function autoPlace(order: WaitingOrder) {
    run({ kind: "auto", quoteId: order.id }, () => autoAssignLoadAction(order.id));
  }

  function unassign(assignmentId: string) {
    run({ kind: "unassign", assignmentId }, () => unassignLoadAction(assignmentId));
  }

  function setStatus(truck: FleetTruck, status: FleetTruck["status"]) {
    run({ kind: "status", truckId: truck.id, status }, () => setVehicleStatusAction(truck.id, status));
  }

  const loadedPercent = summary.capacityKg > 0 ? Math.round((summary.usedKg / summary.capacityKg) * 100) : 0;
  const usedByBand = MATERIAL_IDS.map((material) => ({
    material,
    kg: view.trucks.reduce((sum, truck) => sum + (truck.material === material ? truck.usedKg : 0), 0),
  }));

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">Fleet</h1>
          <p className="mt-1 text-sm text-ink-500">
            Confirmed loads and the trucks carrying them. A truck frees up when its requests are marked Completed.
          </p>
        </div>
        <button type="button" onClick={() => openSheet({ kind: "add" })} className={primaryButton}>
          <Plus aria-hidden="true" className="size-4" />
          Add truck
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={cn(card, "col-span-2 p-4 lg:col-span-1")}>
          <p className="caption text-ink-500">Loaded</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-ink-950">{loadedPercent}%</p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-frost-100" aria-hidden="true">
            {usedByBand.map(({ material, kg }) => (
              <div
                key={material}
                className={cn("h-full w-(--w) transition-[width] duration-500", BAND_STYLES[material].fill)}
                style={{ "--w": `${summary.capacityKg ? (kg / summary.capacityKg) * 100 : 0}%` } as CSSProperties}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {formatCapacity(summary.usedKg)} of {formatCapacity(summary.capacityKg)} on available trucks
          </p>
        </div>
        <div className={cn(card, "p-4", summary.waitingOrders > 0 && "border-saffron-400/60 bg-saffron-50/50")}>
          <p className="caption text-ink-500">Waiting for a truck</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-ink-950">{summary.waitingOrders}</p>
          <p className="mt-2 text-xs text-ink-500">
            {summary.waitingOrders > 0 ? `${formatCapacity(summary.waitingKg)} to place` : "Every confirmed load is placed"}
          </p>
        </div>
        <div className={cn(card, "p-4")}>
          <p className="caption text-ink-500">Free space</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-ink-950">{formatCapacity(summary.freeKg)}</p>
          <p className="mt-2 text-xs text-ink-500">
            {summary.emptyTrucks} empty {summary.emptyTrucks === 1 ? "truck" : "trucks"}
          </p>
        </div>
        <div className={cn(card, "col-span-2 p-4 lg:col-span-1")}>
          <p className="caption text-ink-500">Trucks</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-ink-950">{summary.trucks}</p>
          <p className="mt-2 text-xs text-ink-500">
            {summary.available} available
            {summary.maintenance > 0 ? ` · ${summary.maintenance} in maintenance` : ""}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Queue
          orders={view.waiting}
          confirmedCount={view.confirmedCount}
          selectedId={selected?.id ?? null}
          bands={bands}
          today={today}
          onSelect={(order) => setSelectedId((current) => (current === order.id ? null : order.id))}
          onAuto={autoPlace}
          onDragStart={(order) => setSelectedId(order.id)}
        />

        <div className="min-w-0 space-y-8 lg:order-first">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-500" aria-label="Temperature bands">
            {MATERIAL_IDS.map((material) => (
              <li key={material} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={cn("size-2.5 rounded-sm", BAND_STYLES[material].fill)} />
                {bands[material].label}
              </li>
            ))}
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-sm border border-frost-300 bg-frost-50" />
              Free
            </li>
          </ul>

          {view.trucks.length === 0 ? (
            <div className={cn(card, "flex flex-col items-center px-6 py-14 text-center")}>
              <Truck aria-hidden="true" className="size-10 text-ice-500" />
              <p className="mt-3 font-semibold text-ink-950">No trucks yet</p>
              <p className="mt-1 max-w-sm text-sm text-ink-500">
                Add each truck by its number plate under its payload. Confirmed requests can then be placed on them.
              </p>
              <button type="button" onClick={() => openSheet({ kind: "add" })} className={cn(primaryButton, "mt-5")}>
                <Plus aria-hidden="true" className="size-4" />
                Add your first truck
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <Group
                key={group.capacityKg}
                group={group}
                largest={largest}
                selected={selected}
                bestId={bestId}
                bands={bands}
                onAdd={() => openSheet({ kind: "add", capacityKg: group.capacityKg })}
                onOpen={(truck) => openSheet({ kind: "truck", id: truck.id })}
                onPlace={(truck) => placeOn(truck)}
                onDropOrder={(truck, orderId) => placeOn(truck, view.waiting.find((order) => order.id === orderId) ?? null)}
              />
            ))
          )}
        </div>
      </div>

      {/* Phones: the selected request stays in view while scrolling to a truck. */}
      {selected ? (
        <div className="fixed inset-x-3 bottom-3 z-30 flex items-center gap-3 rounded-2xl bg-navy-950 p-3 pl-4 text-white shadow-2xl lg:hidden">
          <span aria-hidden="true" className={cn("h-9 w-1 shrink-0 rounded-full", BAND_STYLES[selected.material].fill)} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-semibold">{selected.reference}</p>
            <p className="truncate text-xs text-ink-300">{formatKg(remainingKg(selected))} left · tap a truck</p>
          </div>
          <button
            type="button"
            onClick={() => autoPlace(selected)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-navy-950"
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Auto
          </button>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="inline-flex size-10 items-center justify-center rounded-lg text-ink-300 hover:text-white"
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Stop placing</span>
          </button>
        </div>
      ) : null}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6">
        {toast && !sheet ? <ToastMessage key={toast.id} outcome={toast.outcome} floating /> : null}
      </div>

      <Sheet
        open={sheet?.kind === "add"}
        onClose={() => setSheet(null)}
        title={<h2 className="text-lg font-semibold text-ink-950">Add a truck</h2>}
      >
        {sheet?.kind === "add" ? (
          <TruckForm
            sizes={view.sizes}
            defaultCapacityKg={sheet.capacityKg}
            submitLabel="Add truck"
            onSubmit={addVehicleAction}
            onSaved={(message) => {
              notify({ ok: true, message });
              setSheet(null);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(sheetTruck)}
        onClose={() => setSheet(null)}
        title={sheetTruck ? <TruckSheetTitle truck={sheetTruck} /> : null}
        status={toast && sheetTruck ? <ToastMessage key={toast.id} outcome={toast.outcome} /> : null}
      >
        {sheetTruck ? (
          <TruckSheetBody
            truck={sheetTruck}
            sizes={view.sizes}
            bands={bands}
            onUnassign={unassign}
            onStatus={(status) => setStatus(sheetTruck, status)}
            onDone={() => setSheet(null)}
            notify={notify}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function ToastMessage({ outcome, floating }: { outcome: FleetOutcome; floating?: boolean }) {
  return (
    <p
      role={outcome.ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2 text-sm font-medium transition duration-300 starting:translate-y-1 starting:opacity-0",
        floating && "pointer-events-auto max-w-md rounded-xl px-4 py-3 shadow-xl",
        floating ? (outcome.ok ? "bg-ink-950 text-white" : "bg-danger text-white") : outcome.ok ? "text-success" : "text-danger",
      )}
    >
      {outcome.ok ? (
        <CircleCheck aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", floating && "text-leaf-50")} />
      ) : (
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      )}
      {outcome.ok ? outcome.message : outcome.error}
    </p>
  );
}

function Group({
  group,
  largest,
  selected,
  bestId,
  bands,
  onAdd,
  onOpen,
  onPlace,
  onDropOrder,
}: {
  group: CapacityGroup;
  largest: number;
  selected: WaitingOrder | null;
  bestId: string | undefined;
  bands: Bands;
  onAdd: () => void;
  onOpen: (truck: FleetTruck) => void;
  onPlace: (truck: FleetTruck) => void;
  onDropOrder: (truck: FleetTruck, orderId: string) => void;
}) {
  const available = group.trucks.filter((truck) => truck.status === "AVAILABLE");
  const capacity = available.reduce((sum, truck) => sum + truck.capacityKg, 0);
  const used = available.reduce((sum, truck) => sum + truck.usedKg, 0);
  const percent = capacity > 0 ? Math.round((used / capacity) * 100) : 0;

  return (
    <section aria-label={`${formatCapacity(group.capacityKg)} trucks`}>
      <div className="flex items-end justify-between gap-3 border-b border-frost-200 pb-2">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-xl font-semibold text-ink-950">{formatCapacity(group.capacityKg)}</span>
            {group.name ? <span className="truncate text-sm text-ink-500">{group.name}</span> : null}
            {!group.listed ? (
              <span className="rounded bg-frost-100 px-1.5 py-0.5 text-xs text-ink-500">Not a listed size</span>
            ) : null}
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">
            {group.trucks.length === 0
              ? "No trucks"
              : `${group.trucks.length} ${group.trucks.length === 1 ? "truck" : "trucks"} · ${percent}% loaded`}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-ice-700 transition-colors hover:bg-ice-50"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add
          <span className="sr-only"> a {formatCapacity(group.capacityKg)} truck</span>
        </button>
      </div>

      {group.trucks.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-frost-300 px-4 py-6 text-sm text-ink-500 transition-colors hover:border-ice-400 hover:text-ice-700"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add a {formatCapacity(group.capacityKg)} truck by its number plate
        </button>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {group.trucks.map((truck) => (
            <TruckCard
              key={truck.id}
              truck={truck}
              scale={truck.capacityKg / largest}
              selected={selected}
              best={truck.id === bestId}
              bands={bands}
              onOpen={() => onOpen(truck)}
              onPlace={() => onPlace(truck)}
              onDropOrder={(orderId) => onDropOrder(truck, orderId)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TruckCard({
  truck,
  scale,
  selected,
  best,
  bands,
  onOpen,
  onPlace,
  onDropOrder,
}: {
  truck: FleetTruck;
  scale: number;
  selected: WaitingOrder | null;
  best: boolean;
  bands: Bands;
  onOpen: () => void;
  onPlace: () => void;
  onDropOrder: (orderId: string) => void;
}) {
  const [over, setOver] = useState(false);
  const blocked = selected ? blockedReason(asTruckLoad(truck), selected.material) : null;
  const kg = selected && !blocked ? placeableKg(truck, selected) : 0;
  const whole = selected !== null && kg === remainingKg(selected);
  const maintenance = truck.status === "MAINTENANCE";
  const percent = Math.round((truck.usedKg / truck.capacityKg) * 100);
  const free = Math.max(0, truck.capacityKg - truck.usedKg);
  const placing = selected !== null;

  const label = placing
    ? blocked
      ? `${truck.plateNumber}: ${blocked}`
      : `Place ${kg.toLocaleString("en-IN")} kilograms of ${selected.reference} on ${truck.plateNumber}`
    : `${truck.plateNumber}, ${maintenance ? "in maintenance" : `${percent}% loaded`}. Open details`;

  function onDragOver(event: DragEvent) {
    if (!event.dataTransfer.types.includes(DRAG_TYPE) || blocked) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setOver(true);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    const orderId = event.dataTransfer.getData(DRAG_TYPE);
    if (orderId && !blocked) onDropOrder(orderId);
  }

  return (
    <li
      onDragOver={onDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        card,
        "relative flex flex-col p-4 transition-[opacity,box-shadow,border-color,transform] duration-200",
        !placing && "hover:border-ink-300 hover:shadow-sm",
        placing && blocked && "opacity-45",
        placing && !blocked && "border-ice-300 hover:-translate-y-0.5 hover:border-ice-500 hover:shadow-md",
        best && "ring-2 ring-saffron-400 ring-offset-1",
        over && "-translate-y-0.5 border-ice-500 shadow-lg ring-2 ring-ice-400",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <NumberPlate plate={truck.plateNumber} />
        {best ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-saffron-50 px-2 py-0.5 text-xs font-semibold text-saffron-600">
            <Sparkles aria-hidden="true" className="size-3" />
            Best fit
          </span>
        ) : maintenance ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-frost-100 px-2 py-0.5 text-xs font-medium text-ink-600">
            <Wrench aria-hidden="true" className="size-3" />
            Maintenance
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
            <span aria-hidden="true" className={cn("size-2 rounded-full", truck.usedKg > 0 ? BAND_STYLES[truck.material ?? "FROZEN"].fill : "bg-success")} />
            {truck.usedKg === 0 ? "Empty" : truck.usedKg >= truck.capacityKg ? "Full" : truck.material ? bands[truck.material].label : "Loaded"}
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate text-xs text-ink-500">
        {[truck.model, truck.driverName].filter(Boolean).join(" · ") || " "}
      </p>

      <div className="mt-3">
        <TruckGraphic
          capacityKg={truck.capacityKg}
          loads={truck.loads}
          preview={selected && !blocked ? { kg, material: selected.material } : null}
          maintenance={maintenance}
          scale={scale}
        />
      </div>

      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-mono text-ink-700">
          <span className="font-semibold text-ink-950">{truck.usedKg.toLocaleString("en-IN")}</span> / {formatKg(truck.capacityKg)}
        </span>
        <span className="font-mono text-ink-500">{maintenance ? "—" : free > 0 ? `${formatKg(free)} free` : "Full"}</span>
      </div>

      {placing ? (
        <p
          className={cn(
            "mt-2 flex items-center gap-1.5 text-xs font-medium",
            blocked ? "text-ink-500" : whole ? "text-success" : "text-ice-700",
          )}
        >
          {blocked ? (
            blocked
          ) : whole ? (
            <>
              <CircleCheck aria-hidden="true" className="size-3.5" />
              Takes the whole load
            </>
          ) : (
            `Takes ${formatKg(kg)} of ${formatKg(remainingKg(selected))}`
          )}
        </p>
      ) : truck.loads.length > 0 ? (
        <ul className="relative z-10 mt-2 flex flex-wrap gap-1.5">
          {truck.loads.slice(0, 3).map((load) => (
            <li key={load.assignmentId}>
              <Link
                href={`/admin/quotes/${load.quoteId}`}
                className="inline-flex h-6 items-center gap-1 rounded-md bg-frost-100 px-1.5 font-mono text-[0.7rem] font-medium text-ink-700 hover:bg-frost-200 hover:text-ink-950"
              >
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", BAND_STYLES[load.material].fill)} />
                {load.reference}
              </Link>
            </li>
          ))}
          {truck.loads.length > 3 ? (
            <li className="inline-flex h-6 items-center px-1 text-[0.7rem] text-ink-500">+{truck.loads.length - 3} more</li>
          ) : null}
        </ul>
      ) : null}

      {/* The whole card is the button; the request links above sit on top of it. */}
      <button
        type="button"
        aria-label={label}
        disabled={placing && Boolean(blocked)}
        onClick={placing ? onPlace : onOpen}
        className="absolute inset-0 rounded-xl focus-visible:outline-offset-2 disabled:cursor-not-allowed"
      />
    </li>
  );
}

function Queue({
  orders,
  confirmedCount,
  selectedId,
  bands,
  today,
  onSelect,
  onAuto,
  onDragStart,
}: {
  orders: WaitingOrder[];
  confirmedCount: number;
  selectedId: string | null;
  bands: Bands;
  today: string;
  onSelect: (order: WaitingOrder) => void;
  onAuto: (order: WaitingOrder) => void;
  onDragStart: (order: WaitingOrder) => void;
}) {
  return (
    <aside aria-labelledby="fleet-queue" className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:pb-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="fleet-queue" className="font-semibold text-ink-950">
          Waiting for a truck
        </h2>
        <span className="font-mono text-sm text-ink-500">
          {orders.length} of {confirmedCount} confirmed
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Pick a request, then tap a truck<span className="hidden lg:inline">, or drag it onto one</span>.
      </p>

      {orders.length === 0 ? (
        <div className={cn(card, "mt-3 flex items-center gap-3 p-4")}>
          <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success" />
          <p className="text-sm text-ink-700">
            {confirmedCount === 0 ? "No confirmed requests right now." : "Every confirmed load is on a truck."}
          </p>
        </div>
      ) : (
        <ul className="-mx-5 mt-3 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0 lg:flex-col lg:overflow-visible lg:pb-0">
          {orders.map((order) => {
            const isSelected = order.id === selectedId;
            const remaining = remainingKg(order);
            const soon = order.pickupDate !== null && order.pickupDate <= today;
            return (
              <li
                key={order.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(DRAG_TYPE, order.id);
                  event.dataTransfer.effectAllowed = "move";
                  onDragStart(order);
                }}
                className={cn(
                  card,
                  "w-[17rem] shrink-0 snap-start overflow-hidden transition-[border-color,box-shadow] duration-200 lg:w-auto",
                  isSelected ? "border-ice-500 shadow-md ring-2 ring-ice-400/40" : "hover:border-ink-300",
                )}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(order)}
                  className="block w-full cursor-grab p-4 text-left active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-ink-950">{order.reference}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-700">
                      <span aria-hidden="true" className={cn("size-2 rounded-full", BAND_STYLES[order.material].fill)} />
                      {bands[order.material].label}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-ink-950">
                    {order.originCity}
                    <ArrowRight aria-label="to" className="mx-1 inline size-3.5 text-ink-400" />
                    {order.destinationCity}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {order.contactName}
                    {order.pickupDate ? (
                      <span className={cn(soon && "font-semibold text-saffron-600")}>
                        {" "}
                        · pickup {formatIsoDate(order.pickupDate)}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="font-mono text-base font-semibold text-ink-950">{formatKg(remaining)}</span>
                    <span className="text-xs text-ink-500">
                      {order.assignedKg > 0 ? `${formatKg(order.assignedKg)} of ${formatKg(order.quantityKg)} placed` : "to place"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-frost-100" aria-hidden="true">
                    <div
                      className={cn("h-full w-(--w) rounded-full transition-[width] duration-500", BAND_STYLES[order.material].fill)}
                      style={{ "--w": `${(order.assignedKg / order.quantityKg) * 100}%` } as CSSProperties}
                    />
                  </div>
                </button>
                <div className="flex border-t border-frost-200">
                  <button
                    type="button"
                    onClick={() => onAuto(order)}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 text-sm font-semibold text-ice-700 transition-colors hover:bg-ice-50"
                  >
                    <Sparkles aria-hidden="true" className="size-4" />
                    Place automatically
                  </button>
                  <Link
                    href={`/admin/quotes/${order.id}`}
                    className="inline-flex h-10 items-center border-l border-frost-200 px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-frost-50"
                  >
                    Open
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
