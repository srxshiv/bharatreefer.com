"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, EyeOff, RotateCcw } from "lucide-react";
import { saveSectionsAction } from "@/features/content/actions";
import { SECTION_DEFAULTS, SECTION_TEXT_LIMITS, type SectionId, type SectionsSetting } from "@/features/content/sections";
import { cn } from "@/lib/cn";
import { ActionForm } from "../action-form";
import { Switch } from "../switch";
import { card, input, label } from "../ui";

type Row = { id: SectionId; visible: boolean; eyebrow: string; title: string; intro: string };

function defaults(id: SectionId): Pick<Row, "eyebrow" | "title" | "intro"> {
  const fallback = SECTION_DEFAULTS[id];
  return { eyebrow: fallback.eyebrow, title: fallback.title ?? "", intro: fallback.intro };
}

/** Switch sections on and off, put them in order, and change their headings. */
export function SectionsEditor({ setting, fleetTitle }: { setting: SectionsSetting; fleetTitle: string }) {
  const [showFacts, setShowFacts] = useState(setting.showFacts);
  const [rows, setRows] = useState<Row[]>(() =>
    setting.list.map((entry) => {
      const fallback = defaults(entry.id);
      return {
        id: entry.id,
        visible: entry.visible,
        eyebrow: entry.eyebrow ?? fallback.eyebrow,
        title: entry.title ?? fallback.title,
        intro: entry.intro ?? fallback.intro,
      };
    }),
  );
  const [open, setOpen] = useState<SectionId | null>(null);

  function update(id: SectionId, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function move(index: number, offset: -1 | 1) {
    setRows((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const shown = rows.filter((row) => row.visible).length;

  return (
    <ActionForm action={saveSectionsAction} submitLabel="Save sections">
      <input type="hidden" name="sections" value={JSON.stringify({ showFacts, list: rows })} />

      <section className={cn(card, "p-6")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-ink-950">Key facts under the headline</h2>
            <p className="mt-1 text-sm text-ink-500">Truck sizes, temperature bands and reply time, in three small cards.</p>
          </div>
          <Switch checked={showFacts} onChange={setShowFacts} label="Show key facts" />
        </div>
      </section>

      <section className={cn(card, "mt-6 p-6")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-ink-950">Sections below the headline</h2>
          <p className="text-sm text-ink-500">
            {shown} of {rows.length} shown, top to bottom. The quote form is always on.
          </p>
        </div>

        <ol className="mt-4 space-y-2">
          {rows.map((row, index) => (
            <SectionRow
              key={row.id}
              row={row}
              index={index}
              last={index === rows.length - 1}
              open={open === row.id}
              fleetTitle={fleetTitle}
              onToggleOpen={() => setOpen((current) => (current === row.id ? null : row.id))}
              onChange={(patch) => update(row.id, patch)}
              onMove={(offset) => move(index, offset)}
            />
          ))}
        </ol>
      </section>
    </ActionForm>
  );
}

function SectionRow({
  row,
  index,
  last,
  open,
  fleetTitle,
  onToggleOpen,
  onChange,
  onMove,
}: {
  row: Row;
  index: number;
  last: boolean;
  open: boolean;
  fleetTitle: string;
  onToggleOpen: () => void;
  onChange: (patch: Partial<Row>) => void;
  onMove: (offset: -1 | 1) => void;
}) {
  const id = useId();
  const fallback = SECTION_DEFAULTS[row.id];
  const changed = row.eyebrow !== fallback.eyebrow || row.title !== (fallback.title ?? "") || row.intro !== fallback.intro;
  const shownTitle = row.title.trim() || fallback.title || fleetTitle;

  return (
    <li
      className={cn(
        "rounded-xl border transition-colors",
        row.visible ? "border-frost-200 bg-white" : "border-dashed border-frost-300 bg-frost-50",
      )}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={`Move ${fallback.name} up`}
            className="inline-flex size-7 items-center justify-center rounded-md text-ink-500 hover:bg-frost-100 hover:text-ink-950 disabled:opacity-30"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={last}
            aria-label={`Move ${fallback.name} down`}
            className="inline-flex size-7 items-center justify-center rounded-md text-ink-500 hover:bg-frost-100 hover:text-ink-950 disabled:opacity-30"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
          </button>
        </div>

        <button type="button" onClick={onToggleOpen} aria-expanded={open} aria-controls={`${id}-text`} className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn("font-semibold", row.visible ? "text-ink-950" : "text-ink-500")}>{fallback.name}</span>
            {fallback.beta ? (
              <span className="rounded bg-saffron-50 px-1.5 py-px text-[0.65rem] font-semibold tracking-wide text-saffron-600 uppercase">
                Beta
              </span>
            ) : null}
            {!row.visible ? (
              <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                <EyeOff aria-hidden="true" className="size-3.5" />
                Hidden
              </span>
            ) : null}
            {changed ? <span className="text-xs text-ice-700">Own text</span> : null}
          </span>
          <span className="mt-0.5 block truncate text-sm text-ink-500">“{shownTitle}”</span>
        </button>

        <ChevronDown
          aria-hidden="true"
          className={cn("hidden size-4 shrink-0 text-ink-400 transition-transform sm:block", open && "rotate-180")}
        />
        <Switch checked={row.visible} onChange={(visible) => onChange({ visible })} label={`Show ${fallback.name}`} />
      </div>

      {open ? (
        <div id={`${id}-text`} className="space-y-4 border-t border-frost-200 p-4">
          <p className="text-sm text-ink-500">{fallback.about}</p>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <label htmlFor={`${id}-eyebrow`} className={label}>
                Small label above
              </label>
              <input
                id={`${id}-eyebrow`}
                value={row.eyebrow}
                maxLength={SECTION_TEXT_LIMITS.eyebrow}
                onChange={(event) => onChange({ eyebrow: event.target.value })}
                className={cn(input, "mt-1.5")}
              />
            </div>
            <div>
              <label htmlFor={`${id}-title`} className={label}>
                Heading
              </label>
              <input
                id={`${id}-title`}
                value={row.title}
                maxLength={SECTION_TEXT_LIMITS.title}
                placeholder={fallback.title === null ? `Automatic: ${fleetTitle}` : fallback.title}
                onChange={(event) => onChange({ title: event.target.value })}
                className={cn(input, "mt-1.5")}
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${id}-intro`} className={label}>
              Introduction <span className="font-normal text-ink-500">(leave empty for none)</span>
            </label>
            <textarea
              id={`${id}-intro`}
              value={row.intro}
              rows={2}
              maxLength={SECTION_TEXT_LIMITS.intro}
              onChange={(event) => onChange({ intro: event.target.value })}
              className={cn(input, "mt-1.5 h-auto py-2 leading-6")}
            />
          </div>
          {changed ? (
            <button
              type="button"
              onClick={() => onChange(defaults(row.id))}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ice-700 hover:text-ink-950"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Use the original text
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
