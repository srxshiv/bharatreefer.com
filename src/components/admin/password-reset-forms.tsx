"use client";

import { useActionState } from "react";
import { requestPasswordReset, resetPassword, type AuthFormState } from "@/features/auth/actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { FormMessage, SubmitButton } from "./form-parts";
import { input, label } from "./ui";

const INITIAL: AuthFormState = {};

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="forgot-email" className={label}>
          Email
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoFocus
          placeholder="you@example.com"
          defaultValue={state.email}
          required
          className={`${input} mt-2`}
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Sending" className="w-full">
        Email me a link
      </SubmitButton>
    </form>
  );
}

const NEW_PASSWORD_FIELDS = [
  { name: "newPassword", label: "New password" },
  { name: "confirmPassword", label: "Repeat new password" },
] as const;

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(resetPassword, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {/* Tells password managers which account the new password belongs to. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      {NEW_PASSWORD_FIELDS.map((field, index) => (
        <div key={field.name}>
          <label htmlFor={`reset-${field.name}`} className={label}>
            {field.label}
          </label>
          <input
            id={`reset-${field.name}`}
            name={field.name}
            type="password"
            autoComplete="new-password"
            autoFocus={index === 0}
            required
            minLength={PASSWORD_MIN_LENGTH}
            className={`${input} mt-2`}
          />
        </div>
      ))}
      <p className="text-sm text-ink-500">
        Use at least {PASSWORD_MIN_LENGTH} characters. Saving signs you out on every other device.
      </p>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving" className="w-full">
        Save and sign in
      </SubmitButton>
    </form>
  );
}
