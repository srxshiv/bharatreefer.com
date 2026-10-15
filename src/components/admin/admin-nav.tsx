"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { PendingHint } from "./pending-hint";

const LINKS = [
  {
    href: "/admin",
    label: "Requests",
    match: (path: string) =>
      !path.startsWith("/admin/site") && !path.startsWith("/admin/account") && !path.startsWith("/admin/fleet"),
  },
  { href: "/admin/fleet", label: "Fleet", match: (path: string) => path.startsWith("/admin/fleet") },
  { href: "/admin/site", label: "Website", match: (path: string) => path.startsWith("/admin/site") },
  { href: "/admin/account", label: "Account", match: (path: string) => path.startsWith("/admin/account") },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="-mx-5 w-[calc(100%+2.5rem)] overflow-x-auto border-t border-frost-200 px-3 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-6 md:mx-0 md:w-auto md:overflow-visible md:border-0 md:px-0"
    >
      <ul className="flex h-12 items-center gap-1 text-sm font-medium md:h-16">
        {LINKS.map((link) => {
          const active = link.match(pathname);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-9 items-center rounded-md px-3 transition-colors",
                  active ? "bg-navy-900 text-white shadow-sm" : "text-ink-600 hover:bg-navy-50 hover:text-ink-950",
                )}
              >
                {link.label}
                <PendingHint />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const SITE_LINKS: Array<{ href: string; label: string; beta?: boolean }> = [
  { href: "/admin/site", label: "Business details" },
  { href: "/admin/site/sections", label: "Sections" },
  { href: "/admin/site/content", label: "Page text" },
  { href: "/admin/site/temperature", label: "Temperature bands" },
  { href: "/admin/site/fleet", label: "Fleet and photos" },
  { href: "/admin/site/routes", label: "Routes", beta: true },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Website settings" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex gap-1.5 pb-1 whitespace-nowrap">
        {SITE_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors",
                  active
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-frost-300 bg-surface text-ink-700 hover:border-ink-400",
                )}
              >
                {link.label}
                {link.beta ? (
                  <span
                    className={cn(
                      "ml-1.5 rounded px-1 py-px text-[0.65rem] font-semibold tracking-wide uppercase",
                      active ? "bg-white/15 text-ice-200" : "bg-saffron-50 text-saffron-600",
                    )}
                  >
                    Beta
                  </span>
                ) : null}
                <PendingHint />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
