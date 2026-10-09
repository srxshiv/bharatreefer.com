"use client";

import { useActionState } from "react";
import { changePassword, type AuthFormState } from "@/features/auth/actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { FormMessage, SubmitButton } from "./form-parts";
import { input, label } from "./ui";

const INITIAL: AuthFormState = {};

const FIELDS = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  { name: "newPassword", label: "New password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Repeat new password", autoComplete: "new-password" },
] as const;

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, INITIAL);

  return (
    <form action={action} className="max-w-sm space-y-4">
      {FIELDS.map((field) => (
        <div key={field.name}>
          <label htmlFor={`password-${field.name}`} className={label}>
            {field.label}
          </label>
          <input
            id={`password-${field.name}`}
            name={field.name}
            type="password"
            autoComplete={field.autoComplete}
            required
            minLength={field.name === "currentPassword" ? undefined : PASSWORD_MIN_LENGTH}
            className={`${input} mt-2`}
          />
        </div>
      ))}
      <p className="text-sm text-ink-500">Use at least {PASSWORD_MIN_LENGTH} characters.</p>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving">Change password</SubmitButton>
    </form>
  );
}
