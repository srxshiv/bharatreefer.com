"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

/** Copies `text` to the clipboard and says so for a moment. */
export function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (an insecure page, or permission refused): the text is on screen to copy by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-frost-300 bg-surface px-3 text-sm font-medium text-ink-900 transition-colors hover:border-ink-400",
        className,
      )}
    >
      {copied ? <Check aria-hidden="true" className="size-4 text-success" /> : <Copy aria-hidden="true" className="size-4" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
