import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/site/logo";
import { ADMIN_HOME } from "@/features/auth/cookie";
import { getAdmin } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
};

/** Skips the form for someone who is already signed in. */
async function RedirectIfSignedIn() {
  if (await getAdmin()) redirect(ADMIN_HOME);
  return null;
}

export default function LoginPage() {
  return (
    <main className="reefer-wall flex flex-1 flex-col items-center justify-center px-5 py-12">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      <div className="w-full max-w-sm">
        <Logo />
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-2xl shadow-ink-950/40 sm:p-7">
          <h1 className="text-xl font-bold tracking-tight text-ink-950">Sign in to the admin panel</h1>
          <p className="mt-1.5 mb-6 text-sm text-ink-500">Quote requests and customer details.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
