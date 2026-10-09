import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoMark } from "@/components/site/logo";
import { site } from "@/config/site";
import { logout } from "@/features/auth/actions";
import { getAdmin } from "@/features/auth/session";

async function SignedInAs() {
  const admin = await getAdmin();
  if (!admin) return null;
  return <span className="hidden text-sm text-ink-300 md:inline">{admin.name}</span>;
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-white/10 bg-ink-950 text-white">
        <div className="shell flex h-14 items-center gap-3 sm:gap-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5 rounded-md">
            <LogoMark className="size-7" />
            <span className="hidden font-display font-bold tracking-tight sm:inline">
              {site.name}
            </span>
            <span className="caption rounded bg-white/10 px-1.5 py-0.5 text-ink-300">Admin</span>
          </Link>

          <Suspense fallback={null}>
            <AdminNav />
          </Suspense>

          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <Suspense fallback={null}>
              <SignedInAs />
            </Suspense>
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-300 transition-colors hover:text-white"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">View site</span>
              <span className="sr-only sm:hidden">View site</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-300 transition-colors hover:text-white"
              >
                <LogOut aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="shell flex-1 py-8">{children}</main>
    </div>
  );
}
