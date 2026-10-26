import { SiteNav } from "@/components/admin/admin-nav";

export default function SiteSettingsLayout({ children }: LayoutProps<"/admin/site">) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-950">Website</h1>
        <p className="mt-1 text-sm text-ink-500">
          What customers see on the public site. Changes go live as soon as you save.
        </p>
      </div>
      <SiteNav />
      {children}
    </div>
  );
}
