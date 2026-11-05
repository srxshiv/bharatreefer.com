import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS } from "@/config/site";
import { trackingLinkEmail, truckNoticeEmail } from "./emails";
import { isTrackingLinkFresh, parseTrackingUrl, trackingWhatsappMessage, truckNoticeDueAt, type TrackedLoad } from "./tracking";

const load: TrackedLoad = {
  reference: "BR-7K3Q9F",
  contactName: "Asha Verma",
  originCity: "Azadpur",
  destinationCity: "Jaipur",
  loadKg: 2500,
};

describe("parseTrackingUrl", () => {
  it("keeps web links as they are", () => {
    expect(parseTrackingUrl("  https://track.example.in/t/AB12?k=9  ")).toBe("https://track.example.in/t/AB12?k=9");
  });

  it("adds https:// to a link pasted without it", () => {
    expect(parseTrackingUrl("maps.app.goo.gl/abc123")).toBe("https://maps.app.goo.gl/abc123");
  });

  it("refuses anything that is not a web link", () => {
    expect(parseTrackingUrl("")).toBeNull();
    expect(parseTrackingUrl("call the driver")).toBeNull();
    expect(parseTrackingUrl("javascript:alert(1)")).toBeNull();
    expect(parseTrackingUrl("ftp://example.com/file")).toBeNull();
    expect(parseTrackingUrl("https://localhost/x")).toBeNull();
    expect(parseTrackingUrl(`https://example.com/${"a".repeat(2000)}`)).toBeNull();
  });
});

describe("tracking messages", () => {
  const url = "https://track.example.in/t/AB12";

  it("tells the customer which load, which truck, and where to track it", () => {
    expect(trackingWhatsappMessage(load, "HR 55 AR 6518", url, "Bharat Reefer")).toBe(
      "Hello Asha Verma, this is Bharat Reefer. Your load BR-7K3Q9F (Azadpur to Jaipur, 2,500 kg) is on truck HR 55 AR 6518. Track it live here: https://track.example.in/t/AB12",
    );
  });

  it("emails a button that opens the link", () => {
    const email = trackingLinkEmail(load, "HR 55 AR 6518", url, DEFAULT_BUSINESS);
    expect(email.subject).toBe("Track your load BR-7K3Q9F: Azadpur to Jaipur");
    expect(email.html).toContain(`href="${url}"`);
    expect(email.text).toContain(`Track your load: ${url}`);
    expect(email.text).toContain("Truck: HR 55 AR 6518");
  });
});

describe("truck notices", () => {
  it("are due at 8 am India time the day before pickup", () => {
    expect(truckNoticeDueAt("2026-11-07").toISOString()).toBe("2026-11-06T02:30:00.000Z");
    // Across a month end.
    expect(truckNoticeDueAt("2026-12-01").toISOString()).toBe("2026-11-30T02:30:00.000Z");
  });

  it("tell the customer the truck, the driver and the live location", () => {
    const email = truckNoticeEmail(
      { reference: "BR-7K3Q9F", contactName: "Asha Verma", originCity: "Azadpur", destinationCity: "Jaipur", pickupDate: "2026-11-07" },
      [{ plate: "HR 55 AR 6518", capacityKg: 9000, loadKg: 2500, driverName: "Ramesh", driverPhone: "+919812345678", trackingUrl: "https://track.example.in/t/AB12" }],
      DEFAULT_BUSINESS,
    );
    expect(email.subject).toBe("Your truck for BR-7K3Q9F: HR 55 AR 6518, pickup 7 Nov 2026");
    expect(email.text).toContain("Truck: HR 55 AR 6518, 9 t truck, 2,500 kg of your load");
    expect(email.text).toContain("Driver: Ramesh, +91 98123 45678");
    expect(email.text).toContain("Track your truck: https://track.example.in/t/AB12");
  });

  it("lists every truck when the load is split", () => {
    const truck = { capacityKg: 9000, loadKg: 4000, driverName: null, driverPhone: null, trackingUrl: null };
    const email = truckNoticeEmail(
      { reference: "BR-7K3Q9F", contactName: "Asha", originCity: "A", destinationCity: "B", pickupDate: "2026-11-07" },
      [{ ...truck, plate: "HR 55 AR 6518" }, { ...truck, plate: "HR 55 AR 6348" }],
      DEFAULT_BUSINESS,
    );
    expect(email.text).toContain("Your trucks are booked");
    expect(email.text).toContain("Truck 1: HR 55 AR 6518");
    expect(email.text).toContain("Truck 2: HR 55 AR 6348");
    expect(email.text).not.toContain("Track your truck");
  });
});

describe("isTrackingLinkFresh", () => {
  const now = Date.parse("2026-11-20T10:00:00Z");
  it("trusts a link for two weeks", () => {
    expect(isTrackingLinkFresh("2026-11-07T10:00:01Z", now)).toBe(true);
    expect(isTrackingLinkFresh("2026-11-06T10:00:00Z", now)).toBe(false);
    expect(isTrackingLinkFresh(null, now)).toBe(false);
  });
});
