"use client";

import { useId, useState } from "react";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { saveAnnouncementAction } from "@/features/content/actions";
import { ANNOUNCEMENT_TONES, type Announcement, type AnnouncementTone } from "@/features/content/sections";
import { cn } from "@/lib/cn";
import { ActionForm } from "../action-form";
import { Switch } from "../switch";
import { card, input, label } from "../ui";

const TONE_LABELS: Record<AnnouncementTone, string> = { info: "Navy", notice: "Saffron", success: "Green" };
const TONE_SWATCH: Record<AnnouncementTone, string> = { info: "bg-navy-900", notice: "bg-saffron-500", success: "bg-leaf-600" };

/** A one-line bar across the top of the public site, for holidays, new routes and the like. */
export function AnnouncementEditor({ announcement }: { announcement: Announcement }) {
  const id = useId();
  const [value, setValue] = useState(announcement);
  const set = (patch: Partial<Announcement>) => setValue((current) => ({ ...current, ...patch }));

  return (
    <ActionForm action={saveAnnouncementAction} submitLabel="Save announcement">
      <section className={cn(card, "p-6")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-ink-950">Announcement bar</h2>
            <p className="mt-1 text-sm text-ink-500">One line across the top of the site: holiday hours, a new route, a price change.</p>
          </div>
          <Switch checked={value.enabled} onChange={(enabled) => set({ enabled })} label="Show the announcement" name="enabled" />
        </div>

        <div className={cn("mt-5 space-y-4 transition-opacity", !value.enabled && "opacity-60")}>
          <div>
            <label htmlFor={`${id}-text`} className={label}>
              Message
            </label>
            <input
              id={`${id}-text`}
              name="text"
              value={value.text}
              maxLength={160}
              placeholder="Open through Diwali, 1 to 5 November. Book early for the festival rush."
              onChange={(event) => set({ text: event.target.value })}
              className={cn(input, "mt-1.5")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-label`} className={label}>
                Link text <span className="font-normal text-ink-500">(optional)</span>
              </label>
              <input
                id={`${id}-label`}
                name="linkLabel"
                value={value.linkLabel}
                maxLength={40}
                placeholder="Get a quote"
                onChange={(event) => set({ linkLabel: event.target.value })}
                className={cn(input, "mt-1.5")}
              />
            </div>
            <div>
              <label htmlFor={`${id}-url`} className={label}>
                Link goes to
              </label>
              <input
                id={`${id}-url`}
                name="linkUrl"
                value={value.linkUrl}
                maxLength={300}
                placeholder="#quote, https://… or tel:+91…"
                onChange={(event) => set({ linkUrl: event.target.value })}
                className={cn(input, "mt-1.5 font-mono text-sm")}
              />
            </div>
          </div>
          <fieldset>
            <legend className={label}>Colour</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ANNOUNCEMENT_TONES.map((tone) => (
                <label
                  key={tone}
                  className={cn(
                    "inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ice-500",
                    value.tone === tone ? "border-navy-900 bg-frost-50 text-ink-950" : "border-frost-300 text-ink-700 hover:border-ink-400",
                  )}
                >
                  <input
                    type="radio"
                    name="tone"
                    value={tone}
                    checked={value.tone === tone}
                    onChange={() => set({ tone })}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className={cn("size-4 rounded-full", TONE_SWATCH[tone])} />
                  {TONE_LABELS[tone]}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="caption text-ink-500">Preview</p>
            <div className="mt-2 overflow-hidden rounded-lg border border-frost-200">
              <AnnouncementBar announcement={{ ...value, text: value.text || "Your message appears here." }} preview />
            </div>
          </div>
        </div>
      </section>
    </ActionForm>
  );
}
