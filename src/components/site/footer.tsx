import Link from "next/link";
import { site } from "@/config/site";
import { NAV_LINKS } from "./header";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink-950 text-ink-400">
      <div className="shell flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-6">
            {site.tagline} for frozen, chilled and ambient cargo. {site.address.street},{" "}
            {site.address.city}.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="rounded-sm transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/#quote" className="rounded-sm transition-colors hover:text-white">
                Get a quote
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <p className="shell py-5 text-xs">© {site.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
