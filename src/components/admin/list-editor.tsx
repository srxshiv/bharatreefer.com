"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { input, label as labelClass, secondaryButton } from "./ui";

export type ListField = {
  name: string;
  label: string;
  kind?: "text" | "textarea" | "number" | "select";
  /** Choices for a select. */
  options?: string[];
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Tailwind width class for the column on wide screens. */
  width?: string;
};

type Row = Record<string, string>;

/**
 * Edits a short list of records. Fields are submitted as `prefix[index].field`, which the
 * server reads back with `readRows`. Rows keep their own ids so removing one in the middle
 * does not reshuffle what the user typed into the others.
 */
export function ListEditor({
  prefix,
  fields,
  initial,
  max,
  addLabel,
  emptyLabel,
  rowLabel,
  sortable = false,
}: {
  prefix: string;
  fields: ListField[];
  initial: Row[];
  max: number;
  addLabel: string;
  emptyLabel: string;
  /** Singular noun for the screen-reader label of each row's remove button. */
  rowLabel: string;
  /** Shows buttons to move rows up and down; the order is saved. */
  sortable?: boolean;
}) {
  const baseId = useId();
  const [rows, setRows] = useState(() => initial.map((row, index) => ({ key: index, row })));
  const [nextKey, setNextKey] = useState(initial.length);

  function add() {
    setRows((current) => [
      ...current,
      { key: nextKey, row: Object.fromEntries(fields.map((field) => [field.name, ""])) },
    ]);
    setNextKey((key) => key + 1);
  }

  function remove(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
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

  return (
    <div className="space-y-3">
      {rows.length === 0 ? <p className="text-sm text-ink-500">{emptyLabel}</p> : null}

      <ol className="space-y-3">
        {rows.map(({ key, row }, index) => (
          <li
            key={key}
            className="grid gap-3 rounded-lg border border-frost-200 bg-frost-50 p-4 sm:grid-cols-[1fr_auto] sm:items-start"
          >
            <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
              {fields.map((field) => {
                const id = `${baseId}-${key}-${field.name}`;
                const name = `${prefix}[${index}].${field.name}`;
                return (
                  <div key={field.name} className={cn(field.width, field.kind === "textarea" && "sm:col-span-full")}>
                    <label htmlFor={id} className={labelClass}>
                      {field.label}
                    </label>
                    {field.kind === "select" ? (
                      <select
                        id={id}
                        name={name}
                        defaultValue={row[field.name] ?? ""}
                        className={cn(input, "mt-1.5")}
                      >
                        <option value="">{field.placeholder ?? "Choose"}</option>
                        {(field.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.kind === "textarea" ? (
                      <textarea
                        id={id}
                        name={name}
                        defaultValue={row[field.name] ?? ""}
                        rows={2}
                        maxLength={field.maxLength}
                        placeholder={field.placeholder}
                        className={cn(input, "mt-1.5 h-auto py-2 leading-6")}
                      />
                    ) : (
                      <input
                        id={id}
                        name={name}
                        type={field.kind === "number" ? "number" : "text"}
                        inputMode={field.kind === "number" ? "numeric" : undefined}
                        defaultValue={row[field.name] ?? ""}
                        maxLength={field.maxLength}
                        min={field.min}
                        max={field.max}
                        placeholder={field.placeholder}
                        className={cn(input, "mt-1.5", field.kind === "number" && "font-mono")}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 sm:mt-6 sm:flex-col">
              {sortable ? (
                <>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${rowLabel} ${index + 1} up`}
                    className="inline-flex size-10 items-center justify-center rounded-lg border border-frost-300 bg-white text-ink-500 transition-colors hover:border-ink-400 hover:text-ink-950 disabled:opacity-40"
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label={`Move ${rowLabel} ${index + 1} down`}
                    className="inline-flex size-10 items-center justify-center rounded-lg border border-frost-300 bg-white text-ink-500 transition-colors hover:border-ink-400 hover:text-ink-950 disabled:opacity-40"
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => remove(key)}
                aria-label={`Remove ${rowLabel} ${index + 1}`}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-frost-300 bg-white text-ink-500 transition-colors hover:border-danger hover:text-danger"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>

      {rows.length < max ? (
        <button type="button" onClick={add} className={secondaryButton}>
          <Plus aria-hidden="true" className="size-4" />
          {addLabel}
        </button>
      ) : (
        <p className="text-sm text-ink-500">Up to {max} entries.</p>
      )}
    </div>
  );
}
