import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS } from "@/config/site";
import { trackingLinkEmail } from "./emails";
import { parseTrackingUrl, trackingWhatsappMessage, type TrackedLoad } from "./tracking";

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
