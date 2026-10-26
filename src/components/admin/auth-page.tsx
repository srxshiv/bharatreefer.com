import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { LOGIN_PATH } from "@/features/auth/cookie";
import { getSiteContent } from "@/features/content/data";

/**
 * Layout of the signed-out pages beside sign-in (forgot and reset password): the sign-in
 * page's form column on its own, with the way back to sign in at the top.
 */
export async function AuthPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const { business } = await getSiteContent();

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-surface px-6 py-6 sm:px-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={LOGIN_PATH}
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-ink-500 transition-colors hover:text-ink-950"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to sign in
        </Link>
        <ThemeToggle className="-mr-2" />
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
        <Logo name={business.name} priority className="h-16 lg:h-[4.5rem]" />
        <h1 className="mt-10 text-3xl/tight font-semibold tracking-tight text-ink-950">{title}</h1>
        <p className="mt-2 text-[15px] leading-6 text-ink-500">{intro}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
