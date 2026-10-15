import { describe, expect, it } from "vitest";
import { formatDateTimeInIndia, formatIsoDate, formatIsoDayMonth, formatShortDateTimeInIndia } from "./dates";

describe("date formatting", () => {
  it("writes calendar dates the same way everywhere", () => {
    expect(formatIsoDate("2026-10-09")).toBe("9 Oct 2026");
    expect(formatIsoDate("2026-01-31")).toBe("31 Jan 2026");
    expect(formatIsoDayMonth("2026-12-05")).toBe("5 Dec");
  });

  it("gives moments in India time, with am and pm", () => {
    // 06:04 UTC is 11:34 in India.
    expect(formatDateTimeInIndia(new Date("2026-10-15T06:04:00Z"))).toBe("15 Oct 2026, 11:34 am");
    // 18:45 UTC on the 14th is 00:15 on the 15th in India.
    expect(formatShortDateTimeInIndia(new Date("2026-10-14T18:45:00Z"))).toBe("15 Oct, 12:15 am");
    expect(formatShortDateTimeInIndia(new Date("2026-10-15T06:30:00Z"))).toBe("15 Oct, 12:00 pm");
  });

  it("matches what Intl gives on the server for the full form", () => {
    const sample = new Date("2026-03-07T21:09:00Z");
    const intl = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(sample);
    expect(formatDateTimeInIndia(sample)).toBe(intl);
  });
});
