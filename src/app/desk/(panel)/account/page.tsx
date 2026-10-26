import type { Metadata } from "next";
import { PasswordForm } from "@/components/admin/password-form";
import { card } from "@/components/admin/ui";
import { requireAdmin } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Account",
};

// Renders complete on the server: the page is ready in one round trip, so showing a
// skeleton first would only add a flash.
export const instant = false;

function Profile({ admin }: { admin: { name: string; email: string } }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div>
        <dt className="caption text-ink-500">Name</dt>
        <dd className="mt-1 font-medium text-ink-950">{admin.name}</dd>
      </div>
      <div>
        <dt className="caption text-ink-500">Email</dt>
        <dd className="mt-1 font-medium break-all text-ink-950">{admin.email}</dd>
      </div>
    </dl>
  );
}

export default async function AccountPage() {
  const admin = await requireAdmin();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-950">Account</h1>

      <section className={`${card} p-6`}>
        <h2 className="mb-4 font-sans text-base font-semibold text-ink-950">Signed in as</h2>
        <Profile admin={admin} />
      </section>

      <section className={`${card} p-6`}>
        <h2 className="mb-4 font-sans text-base font-semibold text-ink-950">Change password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
