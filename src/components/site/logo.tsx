import { site } from "@/config/site";

/** Three bars, one per temperature band: frozen, chilled, ambient. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="7" fill="#112a38" />
      <rect x="7" y="8" width="18" height="4" rx="2" fill="#5b7cff" />
      <rect x="7" y="14" width="13" height="4" rx="2" fill="#3cc6ec" />
      <rect x="7" y="20" width="8" height="4" rx="2" fill="#f0a52b" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="size-8 shrink-0" />
      <span className="font-display text-[1.0625rem] font-bold tracking-tight text-white">
        {site.name}
      </span>
    </span>
  );
}
