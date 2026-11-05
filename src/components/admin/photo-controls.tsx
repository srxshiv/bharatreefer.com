"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, Trash2 } from "lucide-react";
import { deleteFleetPhotoAction, moveFleetPhotoAction } from "@/features/content/actions";
import { cn } from "@/lib/cn";

const iconButton =
  "inline-flex size-10 items-center justify-center rounded-lg border border-frost-300 bg-surface text-ink-700 transition-colors hover:border-ink-400 disabled:opacity-40";

export function PhotoControls({
  id,
  caption,
  first,
  last,
}: {
  id: string;
  caption: string;
  first: boolean;
  last: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // Which button was pressed, so that one shows it is working.
  const [busy, setBusy] = useState<"up" | "down" | "remove" | null>(null);
  const spinner = <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />;

  function move(direction: "up" | "down") {
    setBusy(direction);
    startTransition(() => moveFleetPhotoAction(id, direction));
  }

  function remove() {
    if (!window.confirm(`Remove the photo "${caption}" from the website?`)) return;
    setBusy("remove");
    startTransition(() => deleteFleetPhotoAction(id));
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => move("up")}
        disabled={pending || first}
        aria-label={`Move "${caption}" earlier`}
        className={iconButton}
      >
        {pending && busy === "up" ? spinner : <ArrowUp aria-hidden="true" className="size-4" />}
      </button>
      <button
        type="button"
        onClick={() => move("down")}
        disabled={pending || last}
        aria-label={`Move "${caption}" later`}
        className={iconButton}
      >
        {pending && busy === "down" ? spinner : <ArrowDown aria-hidden="true" className="size-4" />}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label={`Remove "${caption}"`}
        className={cn(iconButton, "hover:border-danger hover:text-danger")}
      >
        {pending && busy === "remove" ? spinner : <Trash2 aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}
