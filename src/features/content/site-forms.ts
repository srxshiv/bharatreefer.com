import { isRegion } from "@/data/india-locations";
import {
  ANNOUNCEMENT_TONES,
  SECTION_DEFAULTS,
  SECTION_IDS,
  SECTION_TEXT_LIMITS,
  isSafeLink,
  storedText,
  type Announcement,
  type AnnouncementTone,
  type SectionId,
  type SectionsSetting,
} from "./sections";
import type { RouteInfo } from "./types";

// Parsers for the Sections, Announcement and Routes forms. Each returns the value to save or
// a message for the admin, in the words the form uses.

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** The sections form sends its state as one JSON field, `sections`. */
export function parseSectionsForm(formData: FormData): Parsed<SectionsSetting> {
  let raw: unknown;
  try {
    raw = JSON.parse(field(formData, "sections"));
  } catch {
    return { ok: false, error: "The form could not be read. Reload the page and try again." };
  }
  const value = (typeof raw === "object" && raw !== null ? raw : {}) as { showFacts?: unknown; list?: unknown };
  const list = Array.isArray(value.list) ? value.list : [];
  const ids = list.map((item) => (item as { id?: unknown })?.id);
  if (ids.length !== SECTION_IDS.length || !SECTION_IDS.every((id) => ids.includes(id))) {
    return { ok: false, error: "The form could not be read. Reload the page and try again." };
  }

  const stored: SectionsSetting["list"] = [];
  for (const item of list as Array<Record<string, unknown>>) {
    const id = item.id as SectionId;
    const fallback = SECTION_DEFAULTS[id];
    const text = (name: "eyebrow" | "title" | "intro") => (typeof item[name] === "string" ? (item[name] as string) : "");
    for (const name of ["eyebrow", "title", "intro"] as const) {
      if (text(name).trim().length > SECTION_TEXT_LIMITS[name]) {
        return { ok: false, error: `${fallback.name}: keep the ${name === "eyebrow" ? "label" : name} under ${SECTION_TEXT_LIMITS[name]} characters.` };
      }
    }
    stored.push({
      id,
      visible: item.visible === true,
      eyebrow: storedText(text("eyebrow"), fallback.eyebrow),
      title: storedText(text("title"), fallback.title),
      intro: storedText(text("intro"), fallback.intro),
    });
  }
  return { ok: true, value: { showFacts: value.showFacts === true, list: stored } };
}

export function parseAnnouncementForm(formData: FormData): Parsed<Announcement> {
  const enabled = formData.get("enabled") === "on";
  const text = field(formData, "text").replace(/\s+/g, " ");
  const linkLabel = field(formData, "linkLabel").replace(/\s+/g, " ");
  let linkUrl = field(formData, "linkUrl");
  const tone = field(formData, "tone");

  if (enabled && text.length < 3) return { ok: false, error: "Write the announcement, or switch it off." };
  if (text.length > 160) return { ok: false, error: "Keep the announcement under 160 characters." };
  if (linkLabel.length > 40) return { ok: false, error: "Keep the link text under 40 characters." };
  if (/^www\./i.test(linkUrl)) linkUrl = `https://${linkUrl}`;
  if (linkUrl && !isSafeLink(linkUrl)) {
    return { ok: false, error: "Start the link with https://, a / for a page on this site, tel: or mailto:." };
  }
  if (linkUrl && !linkLabel) return { ok: false, error: "Add the text for the link, for example “See the new hours”." };
  if (linkLabel && !linkUrl) return { ok: false, error: "Add where the link goes, or remove its text." };
  if (!(ANNOUNCEMENT_TONES as readonly string[]).includes(tone)) return { ok: false, error: "Choose a colour." };

  return { ok: true, value: { enabled, text, linkLabel, linkUrl, tone: tone as AnnouncementTone } };
}

/** Rows submitted as `routes[0].originState` and so on; completely empty rows are skipped. */
export function parseRoutes(rows: Record<string, string>[], max: number): Parsed<RouteInfo[]> {
  const routes: RouteInfo[] = [];
  for (const [index, row] of rows.entries()) {
    const value = (name: string) => (row[name] ?? "").trim().replace(/\s+/g, " ");
    const filled = ["originState", "originCity", "destinationState", "destinationCity", "transitTime", "frequency"].some(
      (name) => value(name),
    );
    if (!filled) continue;
    const which = `Route ${index + 1}`;
    if (!isRegion(value("originState")) || !isRegion(value("destinationState"))) {
      return { ok: false, error: `${which}: choose both states.` };
    }
    for (const name of ["originCity", "destinationCity"] as const) {
      if (value(name).length < 2 || value(name).length > 60) {
        return { ok: false, error: `${which}: enter both cities.` };
      }
    }
    if (value("transitTime").length > 40 || value("frequency").length > 40) {
      return { ok: false, error: `${which}: keep transit time and frequency under 40 characters.` };
    }
    routes.push({
      originState: value("originState"),
      originCity: value("originCity"),
      destinationState: value("destinationState"),
      destinationCity: value("destinationCity"),
      transitTime: value("transitTime") || null,
      frequency: value("frequency") || null,
    });
  }
  if (routes.length > max) return { ok: false, error: `Up to ${max} routes.` };
  return { ok: true, value: routes };
}
