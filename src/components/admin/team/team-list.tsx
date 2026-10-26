"use client";

import { useId, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import {
  resetTeamMemberPassword,
  setTeamMemberAccess,
  setTeamMemberPromoCode,
  setTeamMemberRole,
  type TeamFormState,
} from "@/features/team/actions";
import type { TeamMember } from "@/features/team/data";
import { ActionForm } from "../action-form";
import { FormMessage } from "../form-parts";
import { Sheet } from "../sheet";
import { input, label, secondaryButton } from "../ui";
import { RoleBadge, RolePicker } from "./role-picker";

const sectionTitle = "font-sans text-base font-semibold text-ink-950";

const smallButton =
  "inline-flex h-9 items-center justify-center rounded-lg border border-frost-300 bg-surface px-3 text-sm font-medium text-ink-900 transition-colors hover:border-ink-400";

/** Every account, each with a Manage panel for its role, password and access. */
export function TeamList({ members, currentUserId }: { members: TeamMember[]; currentUserId: string }) {
  const [managingId, setManagingId] = useState<string | null>(null);
  // Read from the latest props, so the panel shows each change once it is saved.
  const managing = members.find((member) => member.id === managingId) ?? null;

  return (
    <>
      <ul className="divide-y divide-frost-200">
        {members.map((member) => {
          const isYou = member.id === currentUserId;
          return (
            <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <div className={cn("min-w-0 flex-1 basis-48", member.disabledAt && "opacity-60")}>
                <p className="truncate font-medium text-ink-950">
                  {member.name}
                  {isYou ? <span className="ml-2 text-xs font-normal text-ink-500">You</span> : null}
                </p>
                <p className="truncate text-sm text-ink-500">{member.email}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  Code <span className="font-mono font-semibold text-ink-950">{member.promoCode}</span>
                  {" · "}
                  {member.brought === 0
                    ? "no customers yet"
                    : `${member.brought} ${member.brought === 1 ? "request" : "requests"}, ${member.won} went ahead`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {member.disabledAt ? (
                  <span className="inline-flex h-6 items-center rounded-md border border-frost-300 px-2 text-xs font-semibold text-ink-600">
                    Switched off
                  </span>
                ) : null}
                <RoleBadge role={member.role} />
                {isYou ? null : (
                  <button type="button" onClick={() => setManagingId(member.id)} className={smallButton}>
                    Manage
                    <span className="sr-only"> {member.name}</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={managing !== null}
        onClose={() => setManagingId(null)}
        title={
          managing ? (
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink-950">{managing.name}</h2>
              <p className="truncate text-sm text-ink-500">{managing.email}</p>
            </div>
          ) : null
        }
      >
        {/* Keyed so each account's forms start fresh. */}
        {managing ? <ManageMember key={managing.id} member={managing} /> : null}
      </Sheet>
    </>
  );
}

function ManageMember({ member }: { member: TeamMember }) {
  const id = useId();
  return (
    <div className="space-y-8">
      <section>
        <h3 className={cn(sectionTitle, "mb-4")}>Role</h3>
        <ActionForm action={setTeamMemberRole.bind(null, member.id)} submitLabel="Save role">
          <RolePicker defaultValue={member.role} hideLegend />
        </ActionForm>
      </section>

      <section>
        <h3 className={sectionTitle}>Promo code</h3>
        <p className="mt-1 mb-4 text-sm text-ink-500">
          Customers give it on the quote form, and the request counts as theirs. Requests already credited
          stay theirs; the old code stops working.
        </p>
        <ActionForm action={setTeamMemberPromoCode.bind(null, member.id)} submitLabel="Save code">
          <label htmlFor={`${id}-promo`} className={label}>
            Code
          </label>
          <input
            id={`${id}-promo`}
            name="promoCode"
            required
            minLength={4}
            maxLength={5}
            defaultValue={member.promoCode}
            autoComplete="off"
            spellCheck={false}
            className={cn(input, "mt-2 w-40 font-mono uppercase")}
          />
        </ActionForm>
      </section>

      <section>
        <h3 className={sectionTitle}>Set a new password</h3>
        <p className="mt-1 mb-4 text-sm text-ink-500">
          For when they forget theirs. They are signed out everywhere and sign in again with this one.
        </p>
        <ActionForm
          action={resetTeamMemberPassword.bind(null, member.id)}
          submitLabel="Set password"
          resetOnSuccess
        >
          <label htmlFor={`${id}-password`} className={label}>
            New password
          </label>
          <input
            id={`${id}-password`}
            name="password"
            type="text"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            className={cn(input, "mt-2 font-mono")}
          />
        </ActionForm>
      </section>

      <section>
        <h3 className={sectionTitle}>Access</h3>
        <AccessControl member={member} />
      </section>
    </div>
  );
}

/** Switches the account off (asking first) or back on. */
function AccessControl({ member }: { member: TeamMember }) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<TeamFormState>({});
  const [pending, startTransition] = useTransition();
  const enabled = member.disabledAt === null;

  function change(next: boolean) {
    setConfirming(false);
    startTransition(async () => {
      try {
        setState(await setTeamMemberAccess(member.id, next));
      } catch {
        setState({ error: "Could not save. Check your connection and try again." });
      }
    });
  }

  return (
    <div className="mt-1 space-y-4">
      <p className="text-sm text-ink-500">
        {enabled
          ? "Switch the account off when someone leaves. They are signed out at once and cannot sign in. Their name stays on the requests and notes they wrote."
          : "This account is switched off. Switched back on, they can sign in again with their last password."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {!enabled ? (
          <button type="button" disabled={pending} onClick={() => change(true)} className={secondaryButton}>
            Switch back on
          </button>
        ) : confirming ? (
          <>
            <span className="text-sm text-ink-700">Sign {member.name.split(" ")[0]} out and switch the account off?</span>
            <button
              type="button"
              onClick={() => change(false)}
              className="inline-flex h-11 items-center rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              Switch off
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-semibold text-ink-500 hover:text-ink-950"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(true)}
            className="inline-flex h-11 items-center rounded-lg border border-danger/30 bg-danger-soft px-4 text-sm font-semibold text-danger transition-colors hover:border-danger disabled:opacity-60"
          >
            Switch off account
          </button>
        )}
      </div>
      <FormMessage state={state} />
    </div>
  );
}
