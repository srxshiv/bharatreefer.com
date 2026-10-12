import { describe, expect, it } from "vitest";
import { deskStatus, formatClockTime, formatDays, formatHours, normaliseDays } from "@/lib/hours";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hours = { days: weekdays, opens: "08:00", closes: "20:00" };

/** A moment given as India local time. */
function ist(iso: string): Date {
  return new Date(`${iso}+05:30`);
}

describe("formatting", () => {
  it("writes clock times the way people say them", () => {
    expect(formatClockTime("08:00")).toBe("8:00 AM");
    expect(formatClockTime("12:00")).toBe("12:00 PM");
    expect(formatClockTime("00:30")).toBe("12:30 AM");
    expect(formatClockTime("20:15")).toBe("8:15 PM");
  });

  it("compresses runs of days", () => {
    expect(formatDays(weekdays)).toBe("Mon to Sat");
    expect(formatDays(["Monday", "Wednesday", "Friday"])).toBe("Mon, Wed, Fri");
    expect(formatDays(["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"])).toBe("Mon to Wed, Fri, Sat");
    expect(formatDays([...weekdays, "Sunday"])).toBe("Every day");
    expect(formatDays([])).toBe("By appointment");
  });

  it("puts days in week order and drops unknown ones", () => {
    expect(normaliseDays(["Friday", "Monday", "Funday", "Monday"])).toEqual(["Monday", "Friday"]);
  });

  it("joins days and times", () => {
    expect(formatHours(hours)).toBe("Mon to Sat, 8:00 AM to 8:00 PM");
  });
});

describe("deskStatus", () => {
  // 9 October 2026 is a Friday.
  it("is open during the hours on an open day", () => {
    expect(deskStatus(hours, ist("2026-10-09T08:00:00"))).toEqual({ open: true, label: "Desk open, closes 8:00 PM" });
    expect(deskStatus(hours, ist("2026-10-09T19:59:00")).open).toBe(true);
  });

  it("closes at the closing time", () => {
    expect(deskStatus(hours, ist("2026-10-09T20:00:00"))).toEqual({
      open: false,
      label: "Desk closed, opens tomorrow 8:00 AM",
    });
  });

  it("opens later today before the opening time", () => {
    expect(deskStatus(hours, ist("2026-10-09T06:30:00")).label).toBe("Desk closed, opens 8:00 AM");
  });

  it("skips closed days when finding the next opening", () => {
    // Saturday evening: Sunday is closed, so the next opening is Monday.
    expect(deskStatus(hours, ist("2026-10-10T21:00:00")).label).toBe("Desk closed, opens Mon 8:00 AM");
    // Sunday morning.
    expect(deskStatus(hours, ist("2026-10-11T10:00:00")).label).toBe("Desk closed, opens tomorrow 8:00 AM");
  });

  it("judges the time in India wherever the server runs", () => {
    // 02:30 UTC on Friday is 08:00 in India.
    expect(deskStatus(hours, new Date("2026-10-09T02:30:00Z")).open).toBe(true);
    expect(deskStatus(hours, new Date("2026-10-09T02:29:00Z")).open).toBe(false);
  });

  it("handles a desk that opens one day a week", () => {
    const monday = { days: ["Monday"], opens: "09:00", closes: "17:00" };
    expect(deskStatus(monday, ist("2026-10-12T18:00:00")).label).toBe("Desk closed, opens Mon 9:00 AM");
  });

  it("is closed when the hours are not usable", () => {
    expect(deskStatus({ days: [], opens: "08:00", closes: "20:00" }, ist("2026-10-09T10:00:00"))).toEqual({
      open: false,
      label: "Desk closed",
    });
  });
});

describe("India day boundaries", () => {
  it("converts a calendar day to its UTC start and the next day's start", async () => {
    const { startOfDayInIndia, startOfNextDayInIndia } = await import("@/lib/dates");
    expect(startOfDayInIndia("2026-10-09").toISOString()).toBe("2026-10-08T18:30:00.000Z");
    expect(startOfNextDayInIndia("2026-10-09").toISOString()).toBe("2026-10-09T18:30:00.000Z");
  });
});
