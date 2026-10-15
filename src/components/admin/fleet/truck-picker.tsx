"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, Search, Sparkles, X } from "lucide-react";
import { BAND_STYLES } from "@/components/band-styles";
import type { MaterialId } from "@/config/materials";
import { groupTrucks, truckState } from "@/features/fleet/board-state";
import { assessPlacement, bestFitId } from "@/features/fleet/capacity";
import { formatPlate } from "@/features/fleet/plate";
import type { FleetBoard, FleetTruck } from "@/features/fleet/types";
import { cn } from "@/lib/cn";
import { formatCapacity, formatKg } from "@/lib/format";
import { NumberPlate } from "./number-plate";

export type PickerRequest = {
  /** What is being placed, e.g. "Place BR-7K3Q9F" or "Move BR-7K3Q9F". */
  title: string;
  material: MaterialId;
  /** The most that can be placed (what is left of the request), or the load being moved. */
  maxKg: number;
  /** A move takes the whole load: no weight field. */
  fixedKg: boolean;
  /** The truck the load is on now, when moving. */
  fromTruckId?: string;
  /** Where to open: under (or above) the button that asked, or as a bottom sheet when null. */
  position: PickerPosition | null;
};

export type PickerPosition = { top?: number; bottom?: number; left: number; maxHeight: number };

/**
 * Where the picker opens for a button: under it on wide screens, or above it when there is
 * more room there. Null on phones, where it opens as a bottom sheet. Call from the click.
 */
export function placeNear(anchor: HTMLElement | null): PickerPosition | null {
  if (!anchor || window.innerWidth < 640) return null;
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(448, window.innerWidth - 16);
  const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
  // Tall enough to compare several trucks; when neither side of the button has that much
  // room, it sits wherever it fits on screen.
  const height = Math.min(640, window.innerHeight - 16);
  const below = window.innerHeight - rect.bottom - 12;
  const above = rect.top - 12;
  if (below >= height) return { top: rect.bottom + 6, left, maxHeight: height };
  if (above >= height) return { bottom: window.innerHeight - rect.top + 6, left, maxHeight: height };
  return { top: Math.max(8, window.innerHeight - height - 8), left, maxHeight: height };
}

/**
 * A searchable list of every truck, grouped by payload, for choosing where a load goes. Each
 * truck shows what it carries, what it would carry with this load, and anything to know
 * (over the payload, a different temperature, on a trip). The owner always decides: only
 * trucks on a trip or in maintenance cannot be chosen.
 */
export function TruckPicker({
  request,
  board,
  bandLabels,
  onPick,
  onClose,
}: {
  request: PickerRequest | null;
  board: Pick<FleetBoard, "trucks" | "sizes">;
  bandLabels: Record<MaterialId, string>;
  onPick: (truck: FleetTruck, kg: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const [query, setQuery] = useState("");
  const [kgText, setKgText] = useState("");
  const position = request?.position ?? null;
  const open = request !== null;

  // Reset the fields for each new request.
  const [shownFor, setShownFor] = useState<PickerRequest | null>(null);
  if (request !== shownFor) {
    setShownFor(request);
    setQuery("");
    setKgText(request ? String(request.maxKg) : "");
  }

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    dialog.showModal();
    return () => dialog.close();
  }, [open]);

  const kg = request?.fixedKg ? request.maxKg : Number(kgText.replace(/[,\s]/g, ""));
  const kgValid = request !== null && Number.isInteger(kg) && kg > 0 && kg <= request.maxKg;
  const label = (band: MaterialId) => bandLabels[band];

  const states = useMemo(() => new Map(board.trucks.map((truck) => [truck.id, truckState(truck)])), [board.trucks]);
  const suggested = request && kgValid
    ? bestFitId([...states.values()].filter((state) => state.id !== request.fromTruckId), request.material, kg)
    : null;

  const suggestedTruck = suggested ? board.trucks.find((truck) => truck.id === suggested) : undefined;
  const needle = query.trim().toLowerCase().replace(/\s+/g, "");
  const groups = groupTrucks(
    board.trucks.filter((truck) => {
      if (!needle) return true;
      const haystack = [
        truck.plateNumber,
        formatPlate(truck.plateNumber),
        truck.model ?? "",
        truck.driverName ?? "",
        formatCapacity(truck.capacityKg),
        String(truck.capacityKg),
        truck.temperature ? label(truck.temperature) : "",
      ]
        .join("|")
        .toLowerCase()
        .replace(/\s+/g, "");
      return haystack.includes(needle);
    }),
    board.sizes,
  ).filter((group) => group.trucks.length > 0);

  // Sizes that can take the whole load come first; smaller ones follow under their own
  // heading, so the useful trucks are at the top. Each part stays in order of payload.
  const roomy = kgValid ? groups.filter((group) => group.capacityKg >= kg) : groups;
  const small = kgValid ? groups.filter((group) => group.capacityKg < kg) : [];

  function renderGroup(group: (typeof groups)[number]) {
    if (!request) return null;
    return (
      <section key={group.capacityKg} aria-label={`${formatCapacity(group.capacityKg)} trucks`} className="mb-2 last:mb-0">
        <h3 className="sticky top-0 z-10 flex items-baseline gap-2 bg-surface/95 px-2 py-1.5 backdrop-blur-sm">
          <span className="font-mono text-sm font-semibold text-ink-950">{formatCapacity(group.capacityKg)}</span>
          <span className="truncate text-xs text-ink-500">
            {group.name ? `${group.name} · ` : ""}
            {group.trucks.length} {group.trucks.length === 1 ? "truck" : "trucks"}
          </span>
        </h3>
        <ul className="space-y-1">
          {group.trucks.map((truck) => (
            <li key={truck.id}>
              <TruckOption
                truck={truck}
                state={states.get(truck.id)!}
                request={request}
                kg={kg}
                kgValid={kgValid}
                suggested={truck.id === suggested}
                label={label}
                onPick={onPick}
              />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  function moveFocus(event: KeyboardEvent, from: "search" | "option") {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const options = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-option]:not(:disabled)") ?? [])];
    if (options.length === 0) return;
    event.preventDefault();
    if (from === "search") {
      options[event.key === "ArrowDown" ? 0 : options.length - 1].focus();
      return;
    }
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = index + (event.key === "ArrowDown" ? 1 : -1);
    if (next < 0) document.getElementById(`${id}-search`)?.focus();
    else options[Math.min(next, options.length - 1)].focus();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      // Closed by the person (Escape, the X, a click outside); not by the dialog's own close event.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={
        position
          ? {
              // A modal dialog is pinned to all four edges by default; free the ones not used.
              top: position.top ?? "auto",
              bottom: position.bottom ?? "auto",
              left: position.left,
              right: "auto",
              maxHeight: position.maxHeight,
            }
          : undefined
      }
      className={cn(
        "m-0 flex-col overflow-hidden bg-surface p-0 text-ink-900 shadow-2xl open:flex",
        !position
          ? "fixed inset-x-0 top-auto bottom-0 max-h-[88dvh] w-full max-w-none rounded-t-2xl transition-[translate] duration-300 starting:open:translate-y-full"
          : "fixed w-[min(28rem,calc(100vw-1rem))] rounded-xl border border-frost-200 transition-[opacity,translate] duration-150 starting:open:-translate-y-1 starting:open:opacity-0",
        "backdrop:bg-[#000a1c]/40",
      )}
    >
      {request ? (
        <>
          <div className="border-b border-frost-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p id={`${id}-title`} className="truncate text-sm font-semibold text-ink-950">
                  {request.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                  <span aria-hidden="true" className={cn("size-2 rounded-full", BAND_STYLES[request.material].fill)} />
                  {label(request.material)} · {request.fixedKg ? formatKg(request.maxKg) : `${formatKg(request.maxKg)} left to place`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mt-1 -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-frost-100 hover:text-ink-950"
              >
                <X aria-hidden="true" className="size-4.5" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {!request.fixedKg ? (
              <div className="mt-3 flex items-center gap-2">
                <label htmlFor={`${id}-kg`} className="text-sm font-medium text-ink-900">
                  Load
                </label>
                <div className="relative flex-1">
                  <input
                    id={`${id}-kg`}
                    inputMode="numeric"
                    autoComplete="off"
                    value={kgText}
                    onChange={(event) => setKgText(event.target.value)}
                    aria-invalid={!kgValid || undefined}
                    className={cn(
                      "h-10 w-full rounded-lg border bg-surface pr-9 pl-3 font-mono text-sm text-ink-950 focus:ring-2 focus:ring-ice-400/50 focus:outline-none",
                      kgValid ? "border-frost-300 focus:border-ink-900" : "border-danger",
                    )}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-500">kg</span>
                </div>
                {kg !== request.maxKg ? (
                  <button
                    type="button"
                    onClick={() => setKgText(String(request.maxKg))}
                    className="h-10 rounded-lg border border-frost-300 px-3 text-xs font-semibold text-ink-700 hover:border-ink-400"
                  >
                    All
                  </button>
                ) : null}
              </div>
            ) : null}
            {!kgValid && !request.fixedKg ? (
              <p className="mt-1.5 text-xs text-danger">Enter between 1 and {request.maxKg.toLocaleString("en-IN")} kg.</p>
            ) : null}

            <div className="relative mt-2">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
              <input
                id={`${id}-search`}
                type="search"
                autoFocus
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => moveFocus(event, "search")}
                placeholder="Search plate, driver, model or size"
                aria-label="Search trucks"
                className="h-10 w-full rounded-lg border border-frost-300 bg-frost-50 pr-3 pl-9 text-sm text-ink-950 placeholder:text-ink-400 focus:border-ink-900 focus:bg-surface focus:ring-2 focus:ring-ice-400/50 focus:outline-none"
              />
            </div>
          </div>

          <div ref={listRef} data-picker-list className="min-h-0 flex-auto overflow-y-auto overscroll-contain p-2" onKeyDown={(event) => moveFocus(event, "option")}>
            {suggestedTruck && !needle ? (
              <section aria-label="Suggested truck" className="mb-2 rounded-xl bg-saffron-50/50 p-1 dark:bg-ice-50">
                <h3 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-saffron-600">
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  Suggested: takes it all, right temperature
                </h3>
                <TruckOption
                  truck={suggestedTruck}
                  state={states.get(suggestedTruck.id)!}
                  request={request}
                  kg={kg}
                  kgValid={kgValid}
                  suggested={false}
                  label={label}
                  onPick={onPick}
                />
              </section>
            ) : null}
            {groups.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-ink-500">No truck matches “{query}”.</p>
            ) : (
              <>
                {roomy.map(renderGroup)}
                {small.length > 0 ? (
                  <>
                    <p className="mt-3 mb-1 border-t border-frost-200 px-2 pt-3 text-xs font-semibold text-ink-500">
                      Smaller than this load
                    </p>
                    {small.map(renderGroup)}
                  </>
                ) : null}
              </>
            )}
          </div>
        </>
      ) : null}
    </dialog>
  );
}

function TruckOption({
  truck,
  state,
  request,
  kg,
  kgValid,
  suggested,
  label,
  onPick,
}: {
  truck: FleetTruck;
  state: ReturnType<typeof truckState>;
  request: PickerRequest;
  kg: number;
  kgValid: boolean;
  suggested: boolean;
  label: (band: MaterialId) => string;
  onPick: (truck: FleetTruck, kg: number) => void;
}) {
  const current = truck.id === request.fromTruckId;
  const placement = assessPlacement(state, request.material, kgValid ? kg : 0, label);
  const disabled = current || placement.blocked !== null || !kgValid;
  const adding = disabled ? 0 : kg;
  const after = truck.usedKg + adding;
  const over = after > truck.capacityKg;
  // The bar is the payload: what is on board now, then this load. Anything past the end is
  // over the payload, which the label says in words.
  const share = (value: number) => `${Math.min(100, (value / truck.capacityKg) * 100)}%`;
  const otherBand = truck.temperature !== null && truck.temperature !== request.material;
  const mixed = !otherBand && state.bands.some((band) => band !== request.material);

  let verdict: { text: string; tone: string; icon?: boolean };
  if (current) verdict = { text: "Current truck", tone: "bg-frost-100 text-ink-600" };
  else if (placement.blocked) verdict = { text: placement.blocked, tone: "bg-frost-100 text-ink-600" };
  else if (!kgValid) verdict = { text: "Check the weight", tone: "bg-frost-100 text-ink-600" };
  else if (over) verdict = { text: `${formatKg(after - truck.capacityKg)} over`, tone: "bg-danger-soft text-danger" };
  else verdict = { text: "Fits", tone: "bg-success-soft text-success", icon: true };

  return (
    <button
      type="button"
      data-option
      disabled={disabled}
      onClick={() => onPick(truck, kg)}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        disabled
          ? "cursor-not-allowed border-transparent opacity-55"
          : "border-transparent hover:border-ice-300 hover:bg-ice-50 focus-visible:border-ice-500 focus-visible:bg-ice-50 focus-visible:outline-none",
        suggested && "border-saffron-400/60",
      )}
    >
      <span className="flex items-center gap-2">
        <NumberPlate plate={truck.plateNumber} />
        {truck.temperature ? (
          <span className={cn("text-xs font-medium", otherBand ? "text-saffron-600" : "text-ink-500")}>
            {label(truck.temperature)}
            {otherBand ? " truck" : ""}
          </span>
        ) : null}
        {mixed ? <span className="text-xs font-medium text-saffron-600">Has other loads</span> : null}
        <span className={cn("ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", verdict.tone)}>
          {verdict.icon ? <Check aria-hidden="true" className="size-3.5" /> : null}
          {verdict.text}
        </span>
      </span>
      <span aria-hidden="true" className={cn("mt-2.5 flex h-2 overflow-hidden rounded-full bg-frost-100", over && "ring-1 ring-danger")}>
        <span className="h-full shrink-0 bg-ink-300" style={{ width: share(truck.usedKg) }} />
        {adding > 0 ? (
          <span
            className={cn("h-full shrink-0", over ? "bg-danger/70" : BAND_STYLES[request.material].fill)}
            style={{ width: share(adding) }}
          />
        ) : null}
      </span>
      <span className="mt-1.5 block text-xs text-ink-500">
        {adding > 0 ? (
          <>
            <span className={cn("font-mono font-semibold", over ? "text-danger" : "text-ink-950")}>{after.toLocaleString("en-IN")}</span> of{" "}
            {formatKg(truck.capacityKg)} after loading
          </>
        ) : (
          <>
            <span className="font-mono font-semibold text-ink-950">{truck.usedKg.toLocaleString("en-IN")}</span> of {formatKg(truck.capacityKg)} on
            board now
          </>
        )}
      </span>
    </button>
  );
}
