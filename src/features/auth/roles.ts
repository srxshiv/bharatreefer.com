// Kept free of server-only imports so client components can show and pick roles too.

/** What a team member may do in the panel. Matches `UserRole` in the schema. */
export const ROLES = ["STAFF", "ADMIN"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  STAFF: "Staff",
};

/** One line on what each role can do, shown next to the role picker. */
export const ROLE_HINTS: Record<Role, string> = {
  STAFF: "Requests and the fleet, including entering requests for customers.",
  ADMIN: "Everything staff can do, plus the website and the team's accounts.",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
