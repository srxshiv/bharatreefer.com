"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The panel's Sign out button, inside the form that signs out. Signing out takes a moment
 * (the session is removed, then the login page loads), so it says it is working meanwhile.
 */
export function SignOutButton({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  const label = pending ? "Signing out" : "Sign out";
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cn(className, "disabled:cursor-progress disabled:opacity-70")}>
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <LogOut aria-hidden="true" className="size-4" />
      )}
      <span className="hidden lg:inline">{label}</span>
      <span className="sr-only lg:hidden">{label}</span>
    </button>
  );
}
