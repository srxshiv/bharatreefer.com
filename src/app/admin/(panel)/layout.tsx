import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/site/logo";
import { logout } from "@/features/auth/actions";
import { getAdmin } from "@/features/auth/session";
import { getSiteContent } from "@/features/content/data";

async function BrandLogo() {
  const { business } = await getSiteContent();
  return <Logo name={business.name} priority className="h-9 sm:h-10 lg:h-10" />;
}

async function SignedInAs() {
  const admin = await getAdmin();
  if (!admin) return null;
  return <span className="hidden text-sm text-ink-500 md:inline">{admin.name}</span>;
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-frost-200 bg-white">
        <div className="shell flex h-16 items-center gap-3 sm:gap-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-3 rounded-md">
            <Suspense fallback={null}>
              <BrandLogo />
            </Suspense>
            <span className="caption rounded bg-frost-100 px-1.5 py-0.5 text-ink-500">Admin</span>
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
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-frost-100 hover:text-navy-900"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">View site</span>
              <span className="sr-only sm:hidden">View site</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-frost-100 hover:text-navy-900"
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
