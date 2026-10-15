"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition, type CSSProperties, type DragEvent } from "react";
import { ArrowRight, CircleAlert, CircleCheck, Plus, Truck, Wrench } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import { MATERIAL_IDS, type MaterialId } from "@/config/materials";
import {
  addVehicleAction,
  assignLoadAction,
  endTripAction,
  moveLoadAction,
  setVehicleStatusAction,
  startTripAction,
  unassignLoadAction,
} from "@/features/fleet/actions";
import {
  applyChange,
  groupTrucks,
  remainingKg,
  summarise,
  type BoardChange,
  type CapacityGroup,
} from "@/features/fleet/board-state";
import { overKg } from "@/features/fleet/capacity";
import { formatPlate } from "@/features/fleet/plate";
import type { FleetBoard as Board, FleetLoad, FleetOutcome, FleetTruck, WaitingOrder } from "@/features/fleet/types";
import { cn } from "@/lib/cn";
import { formatIsoDate } from "@/lib/dates";
import { formatCapacity, formatKg } from "@/lib/format";
import { IntentLink } from "../intent-link";
import { CHOOSE_TRUCK_EVENT } from "../requests/choose-truck-button";
import { Sheet } from "../sheet";
import { card, primaryButton } from "../ui";
import { LoadRows } from "./load-rows";
import { NumberPlate } from "./number-plate";
import { TripButton, tripSince } from "./trip-button";
import { truckDetails } from "./truck-details";
import { TruckForm } from "./truck-form";
import { TruckGraphic } from "./truck-graphic";
import { TruckPicker, placeNear, type PickerRequest } from "./truck-picker";
import { TruckSheetBody, TruckSheetTitle } from "./truck-sheet";

type Toast = { id: number; outcome: FleetOutcome };
type SheetState = { kind: "truck"; id: string } | { kind: "add"; capacityKg?: number } | null;
type PickerState = {
  request: PickerRequest;
  target: { kind: "assign"; orderId: string } | { kind: "move"; assignmentId: string };
} | null;

const DRAG_TYPE = "application/x-bharat-order";

export function FleetBoard({
  board,
  bandLabels,
  initialOrderId,
}: {
  board: Board;
  bandLabels: Record<MaterialId, string>;
  /** A request to open the truck picker for straight away (from its detail page). */
  initialOrderId?: string;
}) {
  const [view, addChange] = useOptimistic(board, applyChange);
  const [, startTransition] = useTransition();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [picker, setPicker] = useState<PickerState>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dragging, setDragging] = useState(false);
  const toastCount = useRef(0);
  const openedFor = useRef<string | null>(null);

  const summary = summarise(view);
  const groups = groupTrucks(view.trucks, view.sizes);
  const largest = Math.max(1, ...groups.map((group) => group.capacityKg));
  const sheetTruck = sheet?.kind === "truck" ? view.trucks.find((truck) => truck.id === sheet.id) : undefined;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.outcome.ok ? 4000 : 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Coming from a request's page: open the picker for it once, under its queue card.
  useEffect(() => {
    if (!initialOrderId || openedFor.current === initialOrderId) return;
    const order = view.waiting.find((item) => item.id === initialOrderId);
    if (!order) return;
    openedFor.current = initialOrderId;
    const anchor = document.querySelector<HTMLElement>(`[data-order="${CSS.escape(order.id)}"] [data-choose]`);
    anchor?.scrollIntoView({ block: "nearest" });
    openAssign(order, anchor);
  });

  // "Choose truck" in a request's side panel, opened over this board, lands here.
  useEffect(() => {
    function onChoose(event: Event) {
      const order = view.waiting.find((item) => item.id === (event as CustomEvent<string>).detail);
      if (!order) return;
      const anchor = document.querySelector<HTMLElement>(`[data-order="${CSS.escape(order.id)}"] [data-choose]`);
      anchor?.scrollIntoView({ block: "nearest" });
      openAssign(order, anchor);
    }
    window.addEventListener(CHOOSE_TRUCK_EVENT, onChoose);
    return () => window.removeEventListener(CHOOSE_TRUCK_EVENT, onChoose);
  });

  function notify(outcome: FleetOutcome) {
    toastCount.current += 1;
    setToast({ id: toastCount.current, outcome });
  }

  function openSheet(next: SheetState) {
    setToast(null);
    setSheet(next);
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

  function openAssign(order: WaitingOrder, anchor: HTMLElement | null) {
    setToast(null);
    setPicker({
      target: { kind: "assign", orderId: order.id },
      request: {
        title: `Choose a truck for ${order.reference}`,
        material: order.material,
        maxKg: remainingKg(order),
        fixedKg: false,
        position: placeNear(anchor),
      },
    });
  }

  function openMove(truck: FleetTruck, load: FleetLoad, anchor: HTMLElement) {
    setToast(null);
    setPicker({
      target: { kind: "move", assignmentId: load.assignmentId },
      request: {
        title: `Move ${load.reference} off ${formatPlate(truck.plateNumber)}`,
        material: load.material,
        maxKg: load.loadKg,
        fixedKg: true,
        fromTruckId: truck.id,
        position: placeNear(anchor),
      },
    });
  }

  function pick(truck: FleetTruck, kg: number) {
    if (!picker) return;
    const { target } = picker;
    setPicker(null);
    if (target.kind === "assign") {
      run({ kind: "assign", quoteId: target.orderId, truckId: truck.id, kg }, () => assignLoadAction(target.orderId, truck.id, kg));
    } else {
      run({ kind: "move", assignmentId: target.assignmentId, truckId: truck.id }, () => moveLoadAction(target.assignmentId, truck.id));
    }
  }

  function remove(load: FleetLoad) {
    run({ kind: "unassign", assignmentId: load.assignmentId }, () => unassignLoadAction(load.assignmentId));
  }

  function dropOn(truck: FleetTruck, orderId: string) {
    const order = view.waiting.find((item) => item.id === orderId);
    if (!order) return;
    if (truck.status !== "AVAILABLE") {
      notify({ ok: false, error: truck.status === "ON_TRIP" ? "That truck is on a trip." : "That truck is in maintenance." });
      return;
    }
    const kg = remainingKg(order);
    run({ kind: "assign", quoteId: order.id, truckId: truck.id, kg }, () => assignLoadAction(order.id, truck.id, kg));
  }

  const actions = {
    onMove: openMove,
    onRemove: remove,
    onStartTrip: (truck: FleetTruck) => run({ kind: "start-trip", truckId: truck.id }, () => startTripAction(truck.id)),
    onEndTrip: (truck: FleetTruck) => run({ kind: "end-trip", truckId: truck.id }, () => endTripAction(truck.id)),
    onOpen: (truck: FleetTruck) => openSheet({ kind: "truck", id: truck.id }),
    onDrop: dropOn,
  };

  const loadedPercent = summary.capacityKg > 0 ? Math.round((summary.usedKg / summary.capacityKg) * 100) : 0;
  const usedByBand = MATERIAL_IDS.map((material) => ({
    material,
    kg: view.trucks.reduce(
      (sum, truck) => sum + truck.loads.filter((load) => load.material === material).reduce((total, load) => total + load.loadKg, 0),
      0,
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">Fleet</h1>
          <p className="mt-1 text-sm text-ink-500">
            Choose a truck for each confirmed request. Start the trip when it leaves; ending it delivers everything on board.
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
                style={{ "--w": `${summary.capacityKg ? Math.min(100, (kg / summary.capacityKg) * 100) : 0}%` } as CSSProperties}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {formatCapacity(summary.usedKg)} of {formatCapacity(summary.capacityKg)}
            {summary.overweight > 0 ? (
              <span className="font-semibold text-danger">
                {" "}
                · {summary.overweight} {summary.overweight === 1 ? "truck" : "trucks"} over payload
              </span>
            ) : null}
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
          <p className="caption text-ink-500">On the road</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-ink-950">{summary.onTrip}</p>
          <p className="mt-2 text-xs text-ink-500">
            {summary.onTrip > 0 ? `${formatCapacity(summary.onTripKg)} on trips` : "No trips running"}
          </p>
        </div>
        <div className={cn(card, "col-span-2 p-4 lg:col-span-1")}>
          <p className="caption text-ink-500">Trucks</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-ink-950">{summary.trucks}</p>
          <p className="mt-2 text-xs text-ink-500">
            {summary.available} at the depot
            {summary.emptyTrucks > 0 ? ` (${summary.emptyTrucks} empty)` : ""}
            {summary.maintenance > 0 ? ` · ${summary.maintenance} in maintenance` : ""}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Queue
          orders={view.waiting}
          confirmedCount={view.confirmedCount}
          bandLabels={bandLabels}
          today={view.today}
          onChoose={openAssign}
          onDragChange={setDragging}
        />

        <div className="min-w-0 space-y-8 lg:order-first">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-500" aria-label="Key">
            {MATERIAL_IDS.map((material) => (
              <li key={material} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={cn("size-2.5 rounded-sm", BAND_STYLES[material].fill)} />
                {bandLabels[material]}
              </li>
            ))}
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-sm border border-ink-300 dark:border-ink-400" />
              Free
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-sm bg-[repeating-linear-gradient(45deg,rgb(198_40_40/0.6)_0_2px,transparent_2px_4px)] ring-1 ring-danger" />
              Over payload
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
                bandLabels={bandLabels}
                dragging={dragging}
                onAdd={() => openSheet({ kind: "add", capacityKg: group.capacityKg })}
                actions={actions}
              />
            ))
          )}
        </div>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
        {toast && !sheet && !picker ? <ToastMessage key={toast.id} outcome={toast.outcome} floating /> : null}
      </div>

      <TruckPicker request={picker?.request ?? null} board={view} bandLabels={bandLabels} onPick={pick} onClose={() => setPicker(null)} />

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
        status={toast && sheetTruck && !picker ? <ToastMessage key={toast.id} outcome={toast.outcome} /> : null}
      >
        {sheetTruck ? (
          <TruckSheetBody
            truck={sheetTruck}
            sizes={view.sizes}
            bandLabels={bandLabels}
            onMove={(load, anchor) => openMove(sheetTruck, load, anchor)}
            onRemove={remove}
            onStatus={(status) =>
              run({ kind: "status", truckId: sheetTruck.id, status }, () => setVehicleStatusAction(sheetTruck.id, status))
            }
            onStartTrip={() => actions.onStartTrip(sheetTruck)}
            onEndTrip={() => actions.onEndTrip(sheetTruck)}
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
        floating ? (outcome.ok ? "bg-navy-950 text-white ring-1 ring-white/10" : "bg-danger text-white") : outcome.ok ? "text-success" : "text-danger",
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

type TruckActions = {
  onMove: (truck: FleetTruck, load: FleetLoad, anchor: HTMLElement) => void;
  onRemove: (load: FleetLoad) => void;
  onStartTrip: (truck: FleetTruck) => void;
  onEndTrip: (truck: FleetTruck) => void;
  onOpen: (truck: FleetTruck) => void;
  onDrop: (truck: FleetTruck, orderId: string) => void;
};

function Group({
  group,
  largest,
  bandLabels,
  dragging,
  onAdd,
  actions,
}: {
  group: CapacityGroup;
  largest: number;
  bandLabels: Record<MaterialId, string>;
  dragging: boolean;
  onAdd: () => void;
  actions: TruckActions;
}) {
  const running = group.trucks.filter((truck) => truck.status !== "MAINTENANCE");
  const capacity = running.reduce((sum, truck) => sum + truck.capacityKg, 0);
  const used = group.trucks.reduce((sum, truck) => sum + truck.usedKg, 0);
  const percent = capacity > 0 ? Math.round((used / capacity) * 100) : 0;

  return (
    <section aria-label={`${formatCapacity(group.capacityKg)} trucks`}>
      <div className="flex items-end justify-between gap-3 border-b border-frost-200 pb-2">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-xl font-semibold text-ink-950">{formatCapacity(group.capacityKg)}</span>
            {group.name ? <span className="truncate text-sm text-ink-500">{group.name}</span> : null}
            {!group.listed ? <span className="rounded bg-frost-100 px-1.5 py-0.5 text-xs text-ink-500">Not a listed size</span> : null}
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
              bandLabels={bandLabels}
              dragging={dragging}
              actions={actions}
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
  bandLabels,
  dragging,
  actions,
}: {
  truck: FleetTruck;
  scale: number;
  bandLabels: Record<MaterialId, string>;
  dragging: boolean;
  actions: TruckActions;
}) {
  const [over, setOver] = useState(false);
  const overweight = overKg(truck);
  const free = Math.max(0, truck.capacityKg - truck.usedKg);
  const canTake = truck.status === "AVAILABLE";
  const details = truckDetails(truck);

  function onDragOver(event: DragEvent) {
    if (!event.dataTransfer.types.includes(DRAG_TYPE) || !canTake) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setOver(true);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    const orderId = event.dataTransfer.getData(DRAG_TYPE);
    if (orderId) actions.onDrop(truck, orderId);
  }

  return (
    <li
      onDragOver={onDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        card,
        "flex flex-col p-4 transition-[opacity,box-shadow,border-color,transform] duration-200",
        overweight > 0 && "border-danger/50",
        dragging && !canTake && "opacity-50",
        dragging && canTake && "border-ice-300",
        over && "-translate-y-0.5 border-ice-500 shadow-lg ring-2 ring-ice-400",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => actions.onOpen(truck)}
          className="rounded-md text-left"
          aria-label={`${formatPlate(truck.plateNumber)}: open the truck`}
        >
          <NumberPlate plate={truck.plateNumber} />
        </button>
        <div className="flex flex-wrap justify-end gap-1.5">
          {truck.status === "ON_TRIP" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ice-50 px-2 py-0.5 text-xs font-semibold text-ice-700">
              <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-ice-500" />
              On trip
            </span>
          ) : truck.status === "MAINTENANCE" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-frost-100 px-2 py-0.5 text-xs font-medium text-ink-600">
              <Wrench aria-hidden="true" className="size-3" />
              Maintenance
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
              {truck.usedKg > 0 ? "Loading" : "Available"}
            </span>
          )}
        </div>
      </div>
      <p className="mt-1.5 truncate text-xs text-ink-500">{details || " "}</p>

      <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => actions.onOpen(truck)} className="mt-3 block w-full cursor-pointer">
        <TruckGraphic capacityKg={truck.capacityKg} loads={truck.loads} status={truck.status} scale={scale} />
      </button>

      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-mono text-ink-700">
          <span className={cn("font-semibold", overweight > 0 ? "text-danger" : "text-ink-950")}>
            {truck.usedKg.toLocaleString("en-IN")}
          </span>{" "}
          / {formatKg(truck.capacityKg)}
        </span>
        {overweight > 0 ? (
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-danger">
            <CircleAlert aria-hidden="true" className="size-3.5" />
            {formatKg(overweight)} over
          </span>
        ) : (
          <span className="font-mono text-ink-500">{truck.status === "MAINTENANCE" ? "—" : `${formatKg(free)} free`}</span>
        )}
      </div>

      {truck.loads.length > 0 ? (
        <LoadRows
          loads={truck.loads}
          bandLabels={bandLabels}
          onMove={(load, anchor) => actions.onMove(truck, load, anchor)}
          onRemove={actions.onRemove}
          className="mt-2 border-t border-frost-200"
        />
      ) : (
        <p className="mt-2 border-t border-frost-200 pt-2 text-xs text-ink-500">
          {truck.status === "MAINTENANCE" ? "Off the road." : "Empty. Choose it for a request, or drag a request here."}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
        <span className="text-xs text-ink-500">
          {truck.status === "ON_TRIP" && truck.tripStartedAt ? tripSince(truck.tripStartedAt) : null}
        </span>
        <div className="flex items-center gap-1.5">
          <TripButton truck={truck} onStart={() => actions.onStartTrip(truck)} onEnd={() => actions.onEndTrip(truck)} />
          <button
            type="button"
            onClick={() => actions.onOpen(truck)}
            className="inline-flex h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-ink-700 hover:bg-frost-100"
          >
            Details
          </button>
        </div>
      </div>
    </li>
  );
}

function Queue({
  orders,
  confirmedCount,
  bandLabels,
  today,
  onChoose,
  onDragChange,
}: {
  orders: WaitingOrder[];
  confirmedCount: number;
  bandLabels: Record<MaterialId, string>;
  today: string;
  onChoose: (order: WaitingOrder, anchor: HTMLElement) => void;
  onDragChange: (dragging: boolean) => void;
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
        Choose a truck for each one<span className="hidden lg:inline">, or drag it onto a truck</span>.
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
            const remaining = remainingKg(order);
            const soon = order.pickupDate !== null && order.pickupDate <= today;
            return (
              <li
                key={order.id}
                data-order={order.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(DRAG_TYPE, order.id);
                  event.dataTransfer.effectAllowed = "move";
                  onDragChange(true);
                }}
                onDragEnd={() => onDragChange(false)}
                className={cn(card, "w-[17rem] shrink-0 snap-start overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-ink-300 lg:w-auto")}
              >
                {/* The card opens the request in a side panel; drag it onto a truck to place it. */}
                <IntentLink
                  href={`/admin/quotes/${order.id}`}
                  draggable={false}
                  className="block cursor-grab p-4 transition-colors hover:bg-frost-50 active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-ink-950">{order.reference}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-700">
                      <span aria-hidden="true" className={cn("size-2 rounded-full", BAND_STYLES[order.material].fill)} />
                      {bandLabels[order.material]}
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
                      <span className={cn(soon && "font-semibold text-saffron-600")}> · pickup {formatIsoDate(order.pickupDate)}</span>
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
                </IntentLink>
                <button
                  type="button"
                  data-choose
                  onClick={(event) => onChoose(order, event.currentTarget)}
                  className="flex h-11 w-full items-center justify-center gap-1.5 border-t border-frost-200 text-sm font-semibold text-ice-700 transition-colors hover:bg-ice-50"
                >
                  <Truck aria-hidden="true" className="size-4" />
                  Choose truck
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
