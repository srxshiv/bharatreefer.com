/**
 * The sections of the public page below the headline, which the business can switch off,
 * reorder and retitle. The headline and the quote card are always shown.
 */
export const SECTION_IDS = ["bands", "fleet", "routes", "steps", "contact", "faqs"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

type SectionDefault = {
  /** What the admin panel calls it. */
  name: string;
  /** One line on what it shows, for the admin panel. */
  about: string;
  eyebrow: string;
  /** Null: worked out from the other settings (the fleet heading follows the truck sizes). */
  title: string | null;
  intro: string;
  visible: boolean;
  beta?: boolean;
};

export const SECTION_DEFAULTS: Record<SectionId, SectionDefault> = {
  bands: {
    name: "Temperature bands",
    about: "Frozen, chilled and normal, with their ranges and examples.",
    eyebrow: "What we carry",
    title: "Set to what your cargo needs",
    intro: "Tell us what you are moving and the truck is set to the matching band before it loads.",
    visible: true,
  },
  fleet: {
    name: "Fleet",
    about: "Truck sizes, full and part loads, and your photos.",
    eyebrow: "Our fleet",
    title: null,
    intro: "The quote form suggests the smallest truck that carries your weight. Dispatch confirms the vehicle when they quote.",
    visible: true,
  },
  routes: {
    name: "Popular routes",
    about: "The lanes you run often. Tapping one fills in the quote form.",
    eyebrow: "Regular routes",
    title: "Lanes we run every week",
    intro: "Pick a route to start a quote with it filled in.",
    visible: false,
    beta: true,
  },
  steps: {
    name: "How it works",
    about: "The short steps from request to pickup.",
    eyebrow: "How it works",
    title: "From request to a truck at your dock",
    intro: "",
    visible: true,
  },
  contact: {
    name: "Contact",
    about: "Phone, WhatsApp, email, address and desk hours.",
    eyebrow: "Contact",
    title: "Talk to dispatch",
    intro: "Urgent load or an unusual route? Call the desk directly, or send the details through the form and we will come back with a quote.",
    visible: true,
  },
  faqs: {
    name: "Questions and answers",
    about: "The questions from Page text.",
    eyebrow: "Questions",
    title: "Good to know before you book",
    intro: "",
    visible: true,
  },
};

/** How a section appears on the site. Empty text is not shown; a null title is worked out automatically. */
export type PageSection = {
  id: SectionId;
  visible: boolean;
  eyebrow: string;
  title: string | null;
  intro: string;
};

/** Stored form: null text means "use the default". */
export type StoredSection = {
  id: SectionId;
  visible: boolean;
  eyebrow: string | null;
  title: string | null;
  intro: string | null;
};

export type SectionsSetting = { showFacts: boolean; list: StoredSection[] };

export const SECTION_TEXT_LIMITS = { eyebrow: 40, title: 90, intro: 300 } as const;

function isSectionId(value: unknown): value is SectionId {
  return typeof value === "string" && (SECTION_IDS as readonly string[]).includes(value);
}

function textOrNull(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.slice(0, max) : null;
}

/** Reads the stored JSON, tolerating anything missing or malformed. */
export function readSectionsSetting(raw: unknown): SectionsSetting {
  const value = (typeof raw === "object" && raw !== null ? raw : {}) as { showFacts?: unknown; list?: unknown };
  const seen = new Set<SectionId>();
  const list: StoredSection[] = [];
  for (const item of Array.isArray(value.list) ? value.list : []) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    if (!isSectionId(entry.id) || seen.has(entry.id)) continue;
    seen.add(entry.id);
    list.push({
      id: entry.id,
      visible: typeof entry.visible === "boolean" ? entry.visible : SECTION_DEFAULTS[entry.id].visible,
      eyebrow: textOrNull(entry.eyebrow, SECTION_TEXT_LIMITS.eyebrow),
      title: textOrNull(entry.title, SECTION_TEXT_LIMITS.title),
      intro: textOrNull(entry.intro, SECTION_TEXT_LIMITS.intro),
    });
  }
  // Sections added in later versions join at their default position.
  for (const id of SECTION_IDS) {
    if (seen.has(id)) continue;
    const at = SECTION_IDS.indexOf(id);
    const before = list.findIndex((entry) => SECTION_IDS.indexOf(entry.id) > at);
    const entry: StoredSection = { id, visible: SECTION_DEFAULTS[id].visible, eyebrow: null, title: null, intro: null };
    if (before === -1) list.push(entry);
    else list.splice(before, 0, entry);
  }
  return { showFacts: typeof value.showFacts === "boolean" ? value.showFacts : true, list };
}

/** The sections in page order with every default filled in. */
export function resolveSections(setting: SectionsSetting): PageSection[] {
  return setting.list.map((entry) => {
    const fallback = SECTION_DEFAULTS[entry.id];
    return {
      id: entry.id,
      visible: entry.visible,
      eyebrow: entry.eyebrow ?? fallback.eyebrow,
      // A blank title falls back too: every section needs a heading.
      title: entry.title?.trim() ? entry.title.trim() : fallback.title,
      intro: entry.intro ?? fallback.intro,
    };
  });
}

/** What to store for one edited text field: null when it matches the default. */
export function storedText(value: string, fallback: string | null): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed === (fallback ?? "") ? null : trimmed;
}

export const ANNOUNCEMENT_TONES = ["info", "notice", "success"] as const;
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];

export type Announcement = {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkUrl: string;
  tone: AnnouncementTone;
};

export const EMPTY_ANNOUNCEMENT: Announcement = { enabled: false, text: "", linkLabel: "", linkUrl: "", tone: "info" };

/**
 * Links the announcement may point to: web pages, phone numbers, email, WhatsApp, or a
 * place on this site. Anything else (such as "javascript:") is refused.
 */
export function isSafeLink(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  if (url.startsWith("#")) return true;
  return /^(https?:\/\/[^\s]+|tel:\+?[\d\s-]{6,}|mailto:[^\s@]+@[^\s@]+)$/i.test(url);
}

export function readAnnouncement(raw: unknown): Announcement {
  if (typeof raw !== "object" || raw === null) return EMPTY_ANNOUNCEMENT;
  const value = raw as Record<string, unknown>;
  const linkUrl = typeof value.linkUrl === "string" && isSafeLink(value.linkUrl) ? value.linkUrl : "";
  return {
    enabled: value.enabled === true,
    text: typeof value.text === "string" ? value.text.slice(0, 160) : "",
    linkLabel: typeof value.linkLabel === "string" ? value.linkLabel.slice(0, 40) : "",
    linkUrl,
    tone: (ANNOUNCEMENT_TONES as readonly string[]).includes(value.tone as string) ? (value.tone as AnnouncementTone) : "info",
  };
}
