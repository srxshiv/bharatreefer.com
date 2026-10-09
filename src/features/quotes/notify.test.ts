import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailOutcome, OutgoingEmail } from "@/lib/email";
import type { QuoteEmailData } from "./emails";

const sendEmail = vi.fn<(email: OutgoingEmail) => Promise<EmailOutcome>>();
const recordNotification = vi.fn<(quoteId: string, body: string) => Promise<void>>();

vi.mock("@/lib/email", () => ({ sendEmail }));
vi.mock("./data", () => ({ recordNotification }));

const quote: QuoteEmailData = {
  reference: "BR-7K3Q9F",
  originCity: "Ludhiana",
  originState: "Punjab",
  destinationCity: "Mumbai",
  destinationState: "Maharashtra",
  material: "FROZEN",
  quantityKg: 12_500,
  loadType: "FULL_LOAD",
  trucks: [{ capacityKg: 16_000, count: 1 }],
  pickupDate: null,
  notes: null,
  contactName: "Asha Verma",
  phone: "+919871094268",
  email: "asha@example.com",
};

async function notify(data: QuoteEmailData) {
  vi.resetModules();
  const { notifyNewQuoteRequest } = await import("./notify");
  await notifyNewQuoteRequest("quote-id-1", data);
}

describe("notifyNewQuoteRequest", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://user@localhost:5432/test");
    vi.stubEnv("IP_HASH_SALT", "x".repeat(64));
    vi.stubEnv("DISPATCH_EMAIL", "desk@bharatreefer.com");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bharatreefer.com");
    vi.spyOn(console, "error").mockImplementation(() => {});
    recordNotification.mockResolvedValue();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    sendEmail.mockReset();
    recordNotification.mockReset();
  });

  it("alerts dispatch and confirms to the customer, each able to reply to the other", async () => {
    sendEmail.mockResolvedValue({ status: "sent" });
    await notify(quote);

    expect(sendEmail).toHaveBeenCalledTimes(2);
    const [toDispatch, toCustomer] = sendEmail.mock.calls.map(([email]) => email);

    expect(toDispatch.to).toBe("desk@bharatreefer.com");
    expect(toDispatch.replyTo).toBe("asha@example.com");
    expect(toDispatch.text).toContain("https://bharatreefer.com/admin/quotes/quote-id-1");

    expect(toCustomer.to).toBe("asha@example.com");
    expect(toCustomer.replyTo).toBe("desk@bharatreefer.com");

    expect(recordNotification.mock.calls).toEqual([
      ["quote-id-1", "New-request alert emailed to desk@bharatreefer.com"],
      ["quote-id-1", "Confirmation emailed to asha@example.com"],
    ]);
  });

  it("only alerts dispatch when the customer left no email", async () => {
    sendEmail.mockResolvedValue({ status: "sent" });
    await notify({ ...quote, email: null });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].replyTo).toBeUndefined();
    expect(recordNotification).toHaveBeenCalledTimes(1);
  });

  it("records a failed send in the timeline so dispatch can see it", async () => {
    sendEmail
      .mockResolvedValueOnce({ status: "sent" })
      .mockResolvedValueOnce({ status: "failed", reason: "Mailbox does not exist" });
    await notify(quote);

    expect(recordNotification.mock.calls).toEqual([
      ["quote-id-1", "New-request alert emailed to desk@bharatreefer.com"],
      ["quote-id-1", "Confirmation could not be emailed to asha@example.com"],
    ]);
  });

  it("leaves the timeline alone when email is not configured", async () => {
    sendEmail.mockResolvedValue({ status: "skipped" });
    await notify(quote);

    expect(recordNotification).not.toHaveBeenCalled();
  });

  it("never throws, even if recording the result fails", async () => {
    sendEmail.mockResolvedValue({ status: "sent" });
    recordNotification.mockRejectedValue(new Error("database is down"));

    await expect(notify(quote)).resolves.toBeUndefined();
  });
});
