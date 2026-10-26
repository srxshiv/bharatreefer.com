import { ROLES, ROLE_HINTS, ROLE_LABELS, type Role } from "@/features/auth/roles";
import { cn } from "@/lib/cn";
import { label } from "../ui";

/**
 * Staff or admin, each with a line on what it allows. Submits as "role". `hideLegend` keeps
 * the "Role" legend for screen readers only, under a heading that already says it.
 */
export function RolePicker({ defaultValue = "STAFF", hideLegend = false }: { defaultValue?: Role; hideLegend?: boolean }) {
  return (
    <fieldset>
      <legend className={hideLegend ? "sr-only" : label}>Role</legend>
      <div className={cn("grid gap-2 sm:grid-cols-2", !hideLegend && "mt-2")}>
        {ROLES.map((role) => (
          <label
            key={role}
            className={cn(
              "flex cursor-pointer gap-3 rounded-lg border border-frost-300 bg-surface p-3 transition-colors hover:border-ink-400",
              "has-checked:border-navy-900 has-checked:bg-navy-50",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ice-500",
            )}
          >
            <input type="radio" name="role" value={role} defaultChecked={role === defaultValue} className="mt-0.5 size-4" />
            <span>
              <span className="block text-sm font-semibold text-ink-950">{ROLE_LABELS[role]}</span>
              <span className="mt-0.5 block text-xs leading-5 text-ink-500">{ROLE_HINTS[role]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const ROLE_BADGE: Record<Role, string> = {
  ADMIN: "bg-navy-900 text-white",
  STAFF: "bg-frost-200 text-ink-900",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold", ROLE_BADGE[role])}>
      {ROLE_LABELS[role]}
    </span>
  );
}
