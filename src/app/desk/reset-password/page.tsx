import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { AuthPage } from "@/components/admin/auth-page";
import { ResetPasswordForm } from "@/components/admin/password-reset-forms";
import { FORGOT_PASSWORD_PATH } from "@/features/auth/cookie";
import { findResetAccount } from "@/features/auth/password-reset";

export const metadata: Metadata = {
  title: "Choose a new password",
};

/** The form for a link that still works, or the way to get a new one. */
async function ResetForm({ searchParams }: Pick<PageProps<"/desk/reset-password">, "searchParams">) {
  const { token } = await searchParams;
  const account = typeof token === "string" ? await findResetAccount(token) : null;
  if (account && typeof token === "string") {
    return <ResetPasswordForm token={token} email={account.email} />;
  }

  return (
    <div className="space-y-4">
      <p role="alert" className="flex items-start gap-2 text-sm text-danger">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        This link has expired or was already used.
      </p>
      <Link href={FORGOT_PASSWORD_PATH} className="font-semibold text-ice-700 underline underline-offset-4">
        Email me a new link
      </Link>
    </div>
  );
}

export default function ResetPasswordPage({ searchParams }: PageProps<"/desk/reset-password">) {
  return (
    <AuthPage title="Choose a new password" intro="You will be signed in as soon as it is saved.">
      <Suspense fallback={null}>
        <ResetForm searchParams={searchParams} />
      </Suspense>
    </AuthPage>
  );
}
