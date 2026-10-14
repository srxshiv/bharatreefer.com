"use client";

import { useActionState, useState, type KeyboardEvent } from "react";
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail } from "lucide-react";
import { login, type AuthFormState } from "@/features/auth/actions";
import { cn } from "@/lib/cn";

const INITIAL: AuthFormState = {};

const fieldClass = cn(
  "h-12 w-full rounded-xl border border-frost-300 bg-white pl-11 text-[15px] text-ink-950 shadow-xs",
  "transition-[border-color,box-shadow] placeholder:text-ink-400 hover:border-frost-400",
  "focus:border-ice-500 focus:ring-4 focus:ring-ice-500/15 focus:outline-none",
  "aria-invalid:border-danger/60",
);

const labelClass = "block text-sm font-medium text-ink-900";

export function LoginForm({ className }: { className?: string }) {
  const [state, action, pending] = useActionState(login, INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const failed = Boolean(state.error);

  function trackCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  return (
    <form action={action} className={cn("space-y-5", className)}>
      {failed ? (
        <div
          id="login-error"
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/15 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}

      <div>
        <label htmlFor="login-email" className={labelClass}>
          Email
        </label>
        <div className="relative mt-2">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-ink-400"
          />
          <input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            // A sign-in page has one job; starting in the email field saves a click.
            autoFocus
            placeholder="you@example.com"
            defaultValue={state.email}
            required
            aria-invalid={failed || undefined}
            aria-describedby={failed ? "login-error" : undefined}
            className={cn(fieldClass, "pr-4")}
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className={labelClass}>
          Password
        </label>
        <div className="relative mt-2">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-ink-400"
          />
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            onKeyDown={trackCapsLock}
            onKeyUp={trackCapsLock}
            onBlur={() => setCapsLock(false)}
            aria-invalid={failed || undefined}
            aria-describedby={cn(failed && "login-error", capsLock && "login-capslock") || undefined}
            className={cn(fieldClass, "pr-12")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-pressed={showPassword}
            aria-controls="login-password"
            className="absolute inset-y-0 right-1.5 my-auto grid size-9 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-frost-100 hover:text-navy-900"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-4.5" />
            ) : (
              <Eye aria-hidden="true" className="size-4.5" />
            )}
            <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
          </button>
        </div>
        {capsLock ? (
          <p id="login-capslock" className="mt-2 text-xs font-medium text-saffron-600">
            Caps Lock is on.
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 text-[15px] font-medium text-white",
          "shadow-[0_12px_24px_-12px_rgb(10_45_87/0.7)] transition-colors hover:bg-navy-800 disabled:cursor-progress disabled:opacity-75",
        )}
      >
        {pending ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Signing in
          </>
        ) : (
          <>
            Sign in
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
