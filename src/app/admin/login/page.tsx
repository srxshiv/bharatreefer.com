import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/site/logo";
import { ADMIN_HOME } from "@/features/auth/cookie";
import { getAdmin } from "@/features/auth/session";
import { getSiteContent } from "@/features/content/data";

export const metadata: Metadata = {
  title: "Sign in",
};

/** Skips the form for someone who is already signed in. */
async function RedirectIfSignedIn() {
  if (await getAdmin()) redirect(ADMIN_HOME);
  return null;
}

export default async function LoginPage() {
  const { business } = await getSiteContent();

  return (
    <main className="reefer-wall flex flex-1 flex-col items-center justify-center px-5 py-12">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-navy-950/40 sm:p-7">
          <Logo name={business.name} priority className="h-14 lg:h-16" />
          <h1 className="mt-6 text-xl font-bold tracking-tight text-navy-950">Sign in to the admin panel</h1>
          <p className="mt-1.5 mb-6 text-sm text-ink-500">Quote requests and customer details.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
