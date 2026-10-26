"use client";

import { useId } from "react";
import { createTeamMember } from "@/features/team/actions";
import { cn } from "@/lib/cn";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { ActionForm } from "../action-form";
import { input, label } from "../ui";
import { RolePicker } from "./role-picker";

export function AddMemberForm() {
  const id = useId();
  return (
    <ActionForm action={createTeamMember} submitLabel="Create account" pendingLabel="Creating" resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className={label}>
            Name
          </label>
          <input id={`${id}-name`} name="name" required minLength={2} maxLength={80} autoComplete="off" className={cn(input, "mt-2")} />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={label}>
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="off"
            className={cn(input, "mt-2")}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-password`} className={label}>
            Password
          </label>
          {/* Shown as typed: the admin has to pass it on. The browser should not save it as theirs. */}
          <input
            id={`${id}-password`}
            name="password"
            type="text"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-password-hint`}
            className={cn(input, "mt-2 font-mono")}
          />
          <p id={`${id}-password-hint`} className="mt-1.5 text-xs text-ink-500">
            At least {PASSWORD_MIN_LENGTH} characters. They sign in with it and can change it under Account.
          </p>
        </div>
        <div className="sm:col-span-2">
          <RolePicker />
        </div>
      </div>
    </ActionForm>
  );
}
