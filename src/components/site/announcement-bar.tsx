import { ArrowRight } from "lucide-react";
import type { Announcement, AnnouncementTone } from "@/features/content/sections";
import { cn } from "@/lib/cn";

const TONES: Record<AnnouncementTone, string> = {
  info: "bg-navy-900 text-white",
  notice: "bg-saffron-500 text-navy-950",
  success: "bg-leaf-600 text-white",
};

/** The one-line message across the top of the public site. */
export function AnnouncementBar({ announcement, preview }: { announcement: Announcement; preview?: boolean }) {
  const external = /^https?:\/\//i.test(announcement.linkUrl);
  return (
    <div role={preview ? undefined : "region"} aria-label={preview ? undefined : "Announcement"} className={TONES[announcement.tone]}>
      <p className="shell flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-sm font-medium">
        <span>{announcement.text}</span>
        {announcement.linkUrl && announcement.linkLabel ? (
          <a
            href={preview ? undefined : announcement.linkUrl}
            target={external && !preview ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className={cn("inline-flex items-center gap-1 font-semibold underline underline-offset-4", preview && "cursor-default")}
          >
            {announcement.linkLabel}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </a>
        ) : null}
      </p>
    </div>
  );
}
