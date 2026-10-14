import { describe, expect, it } from "vitest";
import { SECTION_DEFAULTS, SECTION_IDS } from "./sections";
import { parseAnnouncementForm, parseRoutes, parseSectionsForm } from "./site-forms";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseSectionsForm", () => {
  const list = SECTION_IDS.map((id) => ({
    id,
    visible: true,
    eyebrow: SECTION_DEFAULTS[id].eyebrow,
    title: SECTION_DEFAULTS[id].title ?? "",
    intro: SECTION_DEFAULTS[id].intro,
  }));

  it("stores only what differs from the defaults, in the order given", () => {
    const reordered = [list[4], ...list.slice(0, 4), list[5]].map((item) =>
      item.id === "bands" ? { ...item, title: "Cold, colder, coldest", visible: false } : item,
    );
    const result = parseSectionsForm(form({ sections: JSON.stringify({ showFacts: false, list: reordered }) }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.showFacts).toBe(false);
    expect(result.value.list.map((item) => item.id)).toEqual(["contact", "bands", "fleet", "routes", "steps", "faqs"]);
    expect(result.value.list[1]).toEqual({ id: "bands", visible: false, eyebrow: null, title: "Cold, colder, coldest", intro: null });
  });

  it("refuses a form that is missing sections or has text that is too long", () => {
    expect(parseSectionsForm(form({ sections: JSON.stringify({ list: list.slice(1) }) })).ok).toBe(false);
    expect(parseSectionsForm(form({ sections: "{" })).ok).toBe(false);
    const long = list.map((item) => (item.id === "steps" ? { ...item, title: "x".repeat(200) } : item));
    expect(parseSectionsForm(form({ sections: JSON.stringify({ list: long }) }))).toMatchObject({ ok: false });
  });
});

describe("parseAnnouncementForm", () => {
  it("accepts an announcement with a link", () => {
    expect(
      parseAnnouncementForm(form({ enabled: "on", text: " Open  on Diwali ", linkLabel: "Call us", linkUrl: "tel:+919871094268", tone: "success" })),
    ).toEqual({ ok: true, value: { enabled: true, text: "Open on Diwali", linkLabel: "Call us", linkUrl: "tel:+919871094268", tone: "success" } });
  });

  it("adds https to a www address and refuses unsafe links", () => {
    const fixed = parseAnnouncementForm(form({ text: "x", linkLabel: "Site", linkUrl: "www.example.com", tone: "info" }));
    expect(fixed).toMatchObject({ ok: true, value: { linkUrl: "https://www.example.com" } });
    expect(parseAnnouncementForm(form({ text: "x", linkLabel: "Go", linkUrl: "javascript:alert(1)", tone: "info" })).ok).toBe(false);
    expect(parseAnnouncementForm(form({ enabled: "on", text: "", tone: "info" })).ok).toBe(false);
  });
});

describe("parseRoutes", () => {
  it("skips blank rows and checks the rest", () => {
    const result = parseRoutes(
      [
        { originState: "Punjab", originCity: "Ludhiana", destinationState: "Maharashtra", destinationCity: "Mumbai", transitTime: "48 hours", frequency: "" },
        { originState: "", originCity: "", destinationState: "", destinationCity: "", transitTime: "", frequency: "" },
      ],
      12,
    );
    expect(result).toEqual({
      ok: true,
      value: [{ originState: "Punjab", originCity: "Ludhiana", destinationState: "Maharashtra", destinationCity: "Mumbai", transitTime: "48 hours", frequency: null }],
    });
    expect(parseRoutes([{ originState: "Atlantis", originCity: "X", destinationState: "Punjab", destinationCity: "Ludhiana" }], 12).ok).toBe(false);
  });
});
