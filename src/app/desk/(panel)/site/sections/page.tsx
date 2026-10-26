import type { Metadata } from "next";
import { AnnouncementEditor } from "@/components/admin/site/announcement-editor";
import { SectionsEditor } from "@/components/admin/site/sections-editor";
import { automaticFleetTitle } from "@/features/content/automatic";
import { getSiteContentForAdmin } from "@/features/content/data";

export const metadata: Metadata = {
  title: "Sections",
};

// Renders complete on the server (one round trip): no skeleton flash. The progress bar at
// the top of the panel shows a click was registered.
export const instant = false;

export default async function SectionsPage() {
  const { content, editable } = await getSiteContentForAdmin();
  return (
    <div className="space-y-6">
      <AnnouncementEditor announcement={editable.announcement} />
      <SectionsEditor setting={editable.sections} fleetTitle={automaticFleetTitle(content.trucks, content.fleet)} />
    </div>
  );
}
