import { describe, expect, it } from "vitest";
import { inboxQuery, parseInboxFilters } from "./filters";

describe("parseInboxFilters", () => {
  it("defaults to every stage, every temperature, page one", () => {
    expect(parseInboxFilters({})).toEqual({ status: "ALL", material: "ALL", q: "", page: 1 });
  });

  it("reads valid values in any letter case", () => {
    expect(
      parseInboxFilters({ status: "quoted", material: "Frozen", q: "  mumbai ", page: "3" }),
    ).toEqual({ status: "QUOTED", material: "FROZEN", q: "mumbai", page: 3 });
  });

  it("ignores values it does not recognise", () => {
    expect(
      parseInboxFilters({ status: "deleted", material: "lukewarm", page: "-2" }),
    ).toEqual({ status: "ALL", material: "ALL", q: "", page: 1 });
    expect(parseInboxFilters({ page: "abc" }).page).toBe(1);
    expect(parseInboxFilters({ page: "0" }).page).toBe(1);
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
    expect(inboxQuery({ status: "ALL", material: "ALL", q: "", page: 1 })).toBe("");
  });

  it("includes only what differs from the defaults", () => {
    expect(inboxQuery({ status: "NEW", material: "ALL", q: "", page: 1 })).toBe("?status=new");
    expect(inboxQuery({ status: "ALL", material: "CHILLED", q: "navi mumbai", page: 2 })).toBe(
      "?material=chilled&q=navi+mumbai&page=2",
    );
  });

  it("round-trips through parseInboxFilters", () => {
    const filters = { status: "CONFIRMED", material: "AMBIENT", q: "a&b=c", page: 4 } as const;
    const params = Object.fromEntries(new URLSearchParams(inboxQuery(filters)));
    expect(parseInboxFilters(params)).toEqual(filters);
  });
});
