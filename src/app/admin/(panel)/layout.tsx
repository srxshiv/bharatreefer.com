import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { NavigationProgress } from "@/components/admin/navigation-progress";
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
  return <span className="hidden text-sm text-ink-500 xl:inline">{admin.name}</span>;
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <header className="border-b border-frost-200 bg-white">
        {/* Phones: logo and account actions on top, the section links in a row beneath. */}
        <div className="shell flex flex-wrap items-center gap-x-3 sm:gap-x-6">
          <Link href="/admin" className="flex h-16 shrink-0 items-center gap-3 rounded-md">
            <Suspense fallback={null}>
              <BrandLogo />
            </Suspense>
            <span className="caption rounded bg-frost-100 px-1.5 py-0.5 text-ink-500">Admin</span>
          </Link>

          <div className="ml-auto flex items-center gap-1 sm:gap-3 md:order-last">
            <Suspense fallback={null}>
              <SignedInAs />
            </Suspense>
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-frost-100 hover:text-navy-900"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              <span className="hidden lg:inline">View site</span>
              <span className="sr-only lg:hidden">View site</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-frost-100 hover:text-navy-900"
              >
                <LogOut aria-hidden="true" className="size-4" />
                <span className="hidden lg:inline">Sign out</span>
                <span className="sr-only lg:hidden">Sign out</span>
              </button>
            </form>
          </div>

          <Suspense fallback={<div className="h-12 w-full md:hidden" />}>
            <AdminNav />
          </Suspense>
        </div>
      </header>

      <main className="shell flex-1 py-8">{children}</main>
    </div>
  );
}
