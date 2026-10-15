"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { startNavigationProgress } from "../navigation-progress";

/** Rows per page; changing it goes to the first page at the new size. */
export function PageSizeSelect({ value, hrefs }: { value: number; hrefs: Record<string, string> }) {
  const router = useRouter();
  const id = useId();
  return (
    <span className="flex items-center gap-1.5">
      <select
        id={id}
        value={value}
        onChange={(event) => {
          startNavigationProgress();
          router.push(hrefs[event.target.value], { scroll: false });
        }}
        className="h-8 rounded-md border border-frost-300 bg-surface px-1.5 font-mono text-sm text-ink-950"
      >
        {Object.keys(hrefs).map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <label htmlFor={id}>per page</label>
    </span>
  );
}
