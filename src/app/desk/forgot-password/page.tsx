import type { Metadata } from "next";
import { AuthPage } from "@/components/admin/auth-page";
import { ForgotPasswordForm } from "@/components/admin/password-reset-forms";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      title="Forgot your password?"
      intro="Enter the email you sign in with and we will send you a link to choose a new one."
    >
      <ForgotPasswordForm />
      <p className="mt-8 border-t border-frost-200 pt-6 text-sm leading-6 text-ink-500">
        No email arriving? Check spam, or ask an admin to set a new password for you on the Team
        page.
      </p>
    </AuthPage>
  );
}
