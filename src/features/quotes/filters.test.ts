import { describe, expect, it } from "vitest";
import {
  DEFAULT_INBOX_FILTERS,
  hasAdvancedFilters,
  inboxQuery,
  isFiltered,
  parseInboxFilters,
} from "./filters";

describe("parseInboxFilters", () => {
  it("defaults to every stage, every temperature, newest first, page one", () => {
    expect(parseInboxFilters({})).toEqual(DEFAULT_INBOX_FILTERS);
  });

  it("reads valid values in any letter case", () => {
    expect(
      parseInboxFilters({ status: "quoted", material: "Frozen", load: "part_load", quoted: "Yes", sort: "PICKUP", q: "  mumbai ", page: "3" }),
    ).toMatchObject({ status: "QUOTED", material: "FROZEN", loadType: "PART_LOAD", quoted: "YES", sort: "pickup", q: "mumbai", page: 3 });
  });

  it("ignores values it does not recognise", () => {
    expect(
      parseInboxFilters({ status: "deleted", material: "lukewarm", load: "half", quoted: "maybe", sort: "random", origin: "Atlantis", from: "yesterday", page: "-2" }),
    ).toEqual(DEFAULT_INBOX_FILTERS);
    expect(parseInboxFilters({ page: "abc" }).page).toBe(1);
    expect(parseInboxFilters({ page: "0" }).page).toBe(1);
  });

  it("accepts real states and calendar dates", () => {
    expect(
      parseInboxFilters({ origin: "Punjab", destination: "Maharashtra", from: "2026-10-01", to: "2026-10-31", pickup_from: "2026-11-01", pickup_to: "2026-11-30" }),
    ).toMatchObject({
      originState: "Punjab",
      destinationState: "Maharashtra",
      from: "2026-10-01",
      to: "2026-10-31",
      pickupFrom: "2026-11-01",
      pickupTo: "2026-11-30",
    });
    expect(parseInboxFilters({ from: "2026-02-30" }).from).toBe("");
  });

  it("puts a back-to-front date range the right way round", () => {
    expect(parseInboxFilters({ from: "2026-10-31", to: "2026-10-01" })).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("takes the first value when a parameter is repeated", () => {
    expect(parseInboxFilters({ status: ["new", "lost"], q: ["a", "b"] })).toMatchObject({
      status: "NEW",
      q: "a",
    });
  });

  it("caps the search text length", () => {
    expect(parseInboxFilters({ q: "x".repeat(500) }).q).toHaveLength(100);
  });
});

describe("inboxQuery", () => {
  it("is empty when everything is at its default", () => {
    expect(inboxQuery(DEFAULT_INBOX_FILTERS)).toBe("");
  });

  it("includes only what differs from the defaults", () => {
    expect(inboxQuery({ status: "NEW" })).toBe("?status=new");
    expect(inboxQuery({ material: "CHILLED", q: "navi mumbai", page: 2 })).toBe(
      "?material=chilled&q=navi+mumbai&page=2",
    );
    expect(inboxQuery({ loadType: "PART_LOAD", quoted: "NO", sort: "oldest" })).toBe("?load=part_load&quoted=no&sort=oldest");
  });

  it("round-trips through parseInboxFilters", () => {
    const filters = {
      ...DEFAULT_INBOX_FILTERS,
      status: "CONFIRMED" as const,
      material: "AMBIENT" as const,
      loadType: "FULL_LOAD" as const,
      quoted: "YES" as const,
      originState: "Tamil Nadu",
      destinationState: "Delhi",
      from: "2026-10-01",
      to: "2026-10-09",
      pickupFrom: "2026-10-10",
      pickupTo: "",
      sort: "pickup" as const,
      q: "a&b=c",
      page: 4,
    };
    const params = Object.fromEntries(new URLSearchParams(inboxQuery(filters)));
    expect(parseInboxFilters(params)).toEqual(filters);
  });
});

describe("filter flags", () => {
  it("knows when the advanced panel holds something", () => {
    expect(hasAdvancedFilters(DEFAULT_INBOX_FILTERS)).toBe(false);
    expect(hasAdvancedFilters({ ...DEFAULT_INBOX_FILTERS, q: "x", material: "FROZEN" })).toBe(false);
    expect(hasAdvancedFilters({ ...DEFAULT_INBOX_FILTERS, pickupTo: "2026-12-01" })).toBe(true);
    expect(hasAdvancedFilters({ ...DEFAULT_INBOX_FILTERS, sort: "oldest" })).toBe(true);
  });

  it("knows when the list is narrowed beyond the status tab", () => {
    expect(isFiltered(DEFAULT_INBOX_FILTERS)).toBe(false);
    expect(isFiltered({ ...DEFAULT_INBOX_FILTERS, status: "NEW" })).toBe(false);
    expect(isFiltered({ ...DEFAULT_INBOX_FILTERS, q: "jaipur" })).toBe(true);
    expect(isFiltered({ ...DEFAULT_INBOX_FILTERS, originState: "Punjab" })).toBe(true);
  });
});
