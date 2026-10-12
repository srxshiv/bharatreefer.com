"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  {
    href: "/admin",
    label: "Requests",
    match: (path: string) => !path.startsWith("/admin/site") && !path.startsWith("/admin/account"),
  },
  { href: "/admin/site", label: "Website", match: (path: string) => path.startsWith("/admin/site") },
  { href: "/admin/account", label: "Account", match: (path: string) => path.startsWith("/admin/account") },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin">
      <ul className="flex items-center gap-1 text-sm font-medium">
        {LINKS.map((link) => {
          const active = link.match(pathname);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-md px-3 transition-colors",
                  active ? "bg-frost-100 text-navy-900" : "text-ink-500 hover:text-navy-900",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const SITE_LINKS = [
  { href: "/admin/site", label: "Business details" },
  { href: "/admin/site/content", label: "Page text" },
  { href: "/admin/site/temperature", label: "Temperature bands" },
  { href: "/admin/site/fleet", label: "Fleet and photos" },
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
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors",
                  active
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-frost-300 bg-white text-ink-700 hover:border-ink-400",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
