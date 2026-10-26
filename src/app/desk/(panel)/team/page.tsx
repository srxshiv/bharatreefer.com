import type { Metadata } from "next";
import { AddMemberForm } from "@/components/admin/team/add-member-form";
import { TeamList } from "@/components/admin/team/team-list";
import { card } from "@/components/admin/ui";
import { requireAdmin } from "@/features/auth/session";
import { listTeam } from "@/features/team/data";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Team",
};

// Renders complete on the server (one round trip): no skeleton flash.
export const instant = false;

const sectionTitle = "font-sans text-base font-semibold text-ink-950";

/** Admins create and manage the accounts that can sign in to the panel. */
export default async function TeamPage() {
  const [admin, members] = await Promise.all([requireAdmin(), listTeam()]);
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-950">Team</h1>
        <p className="mt-1 text-sm text-ink-500">
          Everyone who can sign in to the panel. Staff work the requests and the fleet; admins can also edit
          the website and manage these accounts.
        </p>
      </div>

      <section className={cn(card, "p-6")}>
        <h2 className={cn(sectionTitle, "mb-2")}>Accounts</h2>
        <TeamList members={members} currentUserId={admin.id} />
      </section>

      <section className={cn(card, "p-6")}>
        <h2 className={cn(sectionTitle, "mb-4")}>Add a team member</h2>
        <AddMemberForm />
      </section>
    </div>
  );
}
