import type { Metadata } from "next";
import { FleetBoard } from "@/components/admin/fleet/fleet-board";
import { MATERIAL_IDS } from "@/config/materials";
import { getSiteContent } from "@/features/content/data";
import { getFleetBoard } from "@/features/fleet/data";
import { dateInIndia } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Fleet",
};

// Renders complete on the server (one round trip): no skeleton flash. The progress bar at
// the top of the panel shows a click was registered.
export const instant = false;

export default async function FleetPage({ searchParams }: PageProps<"/admin/fleet">) {
  const [{ order }, board, { bands }] = await Promise.all([searchParams, getFleetBoard(), getSiteContent()]);
  const bandInfo = Object.fromEntries(
    MATERIAL_IDS.map((id) => [id, { label: bands[id].label, range: bands[id].range }]),
  ) as Record<(typeof MATERIAL_IDS)[number], { label: string; range: string }>;

  return (
    <FleetBoard
      board={board}
      bands={bandInfo}
      today={dateInIndia()}
      initialOrderId={typeof order === "string" ? order : undefined}
    />
  );
}
