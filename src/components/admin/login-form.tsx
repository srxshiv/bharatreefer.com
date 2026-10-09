"use client";

import { useActionState } from "react";
import { login, type AuthFormState } from "@/features/auth/actions";
import { FormMessage, SubmitButton } from "./form-parts";
import { input, label } from "./ui";

const INITIAL: AuthFormState = {};

export function LoginForm() {
  const [state, action] = useActionState(login, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="login-email" className={label}>
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email}
          required
          className={`${input} mt-2`}
        />
      </div>
      <div>
        <label htmlFor="login-password" className={label}>
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={`${input} mt-2`}
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Signing in" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
