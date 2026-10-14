import { describe, expect, it } from "vitest";
import {
  SECTION_DEFAULTS,
  SECTION_IDS,
  isSafeLink,
  readAnnouncement,
  readSectionsSetting,
  resolveSections,
  storedText,
} from "./sections";

describe("readSectionsSetting", () => {
  it("gives every section in the default order when nothing is stored", () => {
    const setting = readSectionsSetting(null);
    expect(setting.showFacts).toBe(true);
    expect(setting.list.map((entry) => entry.id)).toEqual([...SECTION_IDS]);
    expect(setting.list.find((entry) => entry.id === "routes")?.visible).toBe(false);
  });

  it("keeps the stored order and slots in sections it does not know about", () => {
    const setting = readSectionsSetting({
      showFacts: false,
      list: [
        { id: "contact", visible: false },
        { id: "bands", visible: true, eyebrow: "Cold chain" },
        { id: "nonsense", visible: true },
        { id: "bands", visible: false },
      ],
    });
    expect(setting.showFacts).toBe(false);
    expect(setting.list.map((entry) => entry.id)).toEqual(["fleet", "routes", "steps", "contact", "bands", "faqs"]);
    expect(setting.list.find((entry) => entry.id === "bands")).toMatchObject({ visible: true, eyebrow: "Cold chain" });
  });
});

describe("resolveSections", () => {
  it("fills in default text, hides empty text and keeps automatic titles", () => {
    const sections = resolveSections(
      readSectionsSetting({ list: [{ id: "bands", visible: true, eyebrow: "", title: "  ", intro: "" }] }),
    );
    const bands = sections.find((section) => section.id === "bands")!;
    expect(bands).toMatchObject({ eyebrow: "", title: SECTION_DEFAULTS.bands.title, intro: "" });
    expect(sections.find((section) => section.id === "fleet")!.title).toBeNull();
  });
});

describe("storedText", () => {
  it("stores nothing for the default and tidies what was typed", () => {
    expect(storedText(" What we carry ", "What we carry")).toBeNull();
    expect(storedText("Our  trucks", "Our fleet")).toBe("Our trucks");
    expect(storedText("", "Some intro")).toBe("");
    expect(storedText("", null)).toBeNull();
  });
});

describe("announcement", () => {
  it("only links to safe places", () => {
    for (const url of ["https://example.com/x", "/#quote", "#quote", "tel:+919871094268", "mailto:a@b.in"]) {
      expect(isSafeLink(url)).toBe(true);
    }
    for (const url of ["javascript:alert(1)", "//evil.example", "data:text/html,x", "ftp://x"]) {
      expect(isSafeLink(url)).toBe(false);
    }
  });

  it("drops unsafe links and unknown tones from stored data", () => {
    expect(readAnnouncement({ enabled: true, text: "Diwali hours", linkUrl: "javascript:x", tone: "loud" })).toEqual({
      enabled: true,
      text: "Diwali hours",
      linkLabel: "",
      linkUrl: "",
      tone: "info",
    });
  });
});
