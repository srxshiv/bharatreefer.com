"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { primaryButton } from "./ui";

type ButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
};

/** Submit button that disables itself and shows progress while `pending` is true. */
export function PendingButton({
  pending,
  children,
  pendingLabel,
  className,
}: ButtonProps & { pending: boolean }) {
  return (
    <button type="submit" disabled={pending} className={cn(primaryButton, className)}>
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** The same button for forms that use an `action`: it reads the pending state itself. */
export function SubmitButton(props: ButtonProps) {
  const { pending } = useFormStatus();
  return <PendingButton pending={pending} {...props} />;
}

/** Result of the last submission: an error is announced immediately, a success politely. */
export function FormMessage({ state }: { state: { error?: string; success?: string } }) {
  if (state.error) {
    return (
      <p role="alert" className="flex items-start gap-2 text-sm text-danger">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="flex items-start gap-2 text-sm text-success">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {state.success}
      </p>
    );
  }
  return null;
}
