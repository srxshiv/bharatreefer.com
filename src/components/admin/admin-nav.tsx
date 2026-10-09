"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin", label: "Requests", match: (path: string) => !path.startsWith("/admin/account") },
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
                  active ? "bg-white/10 text-white" : "text-ink-300 hover:text-white",
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
