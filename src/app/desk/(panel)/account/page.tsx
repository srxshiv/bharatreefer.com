import type { Metadata } from "next";
import { CopyButton } from "@/components/admin/copy-button";
import { PasswordForm } from "@/components/admin/password-form";
import { card } from "@/components/admin/ui";
import { siteUrl } from "@/config/site";
import { ROLE_HINTS, ROLE_LABELS } from "@/features/auth/roles";
import { requireUser, type User } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Account",
};

// Renders complete on the server: the page is ready in one round trip, so showing a
// skeleton first would only add a flash.
export const instant = false;

function Profile({ user }: { user: User }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div>
        <dt className="caption text-ink-500">Name</dt>
        <dd className="mt-1 font-medium text-ink-950">{user.name}</dd>
      </div>
      <div>
        <dt className="caption text-ink-500">Email</dt>
        <dd className="mt-1 font-medium break-all text-ink-950">{user.email}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="caption text-ink-500">Role</dt>
        <dd className="mt-1 font-medium text-ink-950">{ROLE_LABELS[user.role]}</dd>
        <dd className="mt-0.5 text-sm text-ink-500">{ROLE_HINTS[user.role]}</dd>
      </div>
    </dl>
  );
}

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-950">Account</h1>

      <section className={`${card} p-6`}>
        <h2 className="mb-4 font-sans text-base font-semibold text-ink-950">Signed in as</h2>
        <Profile user={user} />
      </section>

      <section className={`${card} p-6`}>
        <h2 className="font-sans text-base font-semibold text-ink-950">Your promo code</h2>
        <p className="mt-1 text-sm text-ink-500">
          Give it to customers. When they enter it on the quote form, the request counts as yours
          {user.role === "ADMIN" ? "" : " and shows up in your list"}. The link fills it in for them.
        </p>
        <p className="mt-4 font-mono text-3xl font-semibold tracking-widest text-ink-950">{user.promoCode}</p>
        <p className="mt-3 font-mono text-sm break-all text-ink-700">{`${siteUrl}/?code=${user.promoCode}`}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={user.promoCode} label="Copy code" />
          <CopyButton text={`${siteUrl}/?code=${user.promoCode}`} label="Copy link" />
        </div>
      </section>

      <section className={`${card} p-6`}>
        <h2 className="mb-4 font-sans text-base font-semibold text-ink-950">Change password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
