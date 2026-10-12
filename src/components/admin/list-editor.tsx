"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { input, label as labelClass, secondaryButton } from "./ui";

export type ListField = {
  name: string;
  label: string;
  kind?: "text" | "textarea" | "number";
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
}: {
  prefix: string;
  fields: ListField[];
  initial: Row[];
  max: number;
  addLabel: string;
  emptyLabel: string;
  /** Singular noun for the screen-reader label of each row's remove button. */
  rowLabel: string;
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
                    {field.kind === "textarea" ? (
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
            <button
              type="button"
              onClick={() => remove(key)}
              aria-label={`Remove ${rowLabel} ${index + 1}`}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-frost-300 bg-white text-ink-500 transition-colors hover:border-danger hover:text-danger sm:mt-6"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
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
