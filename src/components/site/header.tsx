import Link from "next/link";
import { Phone } from "lucide-react";
import { site } from "@/config/site";
import { Logo } from "./logo";

export const NAV_LINKS = [
  { href: "/#temperature", label: "Temperature bands" },
  { href: "/#fleet", label: "Fleet" },
  { href: "/#questions", label: "Questions" },
  { href: "/#contact", label: "Contact" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/95 backdrop-blur-sm">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${site.name} home`} className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-sm font-medium text-ink-300">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="rounded-sm transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={`tel:${site.phone.e164}`}
            aria-label={`Call ${site.phone.display}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-white/10 sm:px-3"
          >
            <Phone aria-hidden="true" className="size-4 text-ice-400" />
            <span className="hidden sm:inline">{site.phone.display}</span>
          </a>
          <Link
            href="/#quote"
            className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-ink-950 transition-colors hover:bg-frost-100"
          >
            Get a quote
          </Link>
        </div>
      </div>
    </header>
  );
}
