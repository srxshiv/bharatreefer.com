import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const message = {
  to: "customer@example.com",
  subject: "Hello",
  html: "<p>Hello</p>",
  text: "Hello",
  replyTo: "dispatch@example.com",
};

/** Loads a fresh copy of the module so each test reads its own environment. */
async function loadSendEmail() {
  vi.resetModules();
  return (await import("@/lib/email")).sendEmail;
}

describe("sendEmail", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://user@localhost:5432/test");
    vi.stubEnv("IP_HASH_SALT", "x".repeat(64));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("skips sending when no API key is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    const sendEmail = await loadSendEmail();

    expect(await sendEmail(message)).toEqual({ status: "skipped" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the message to Resend with the key and sender", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Bharat Reefer <quotes@bharatreefer.com>");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "1" }), { status: 200 }));
    const sendEmail = await loadSendEmail();

    expect(await sendEmail(message)).toEqual({ status: "sent" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    expect(JSON.parse(init.body)).toEqual({
      from: "Bharat Reefer <quotes@bharatreefer.com>",
      to: ["customer@example.com"],
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
      reply_to: "dispatch@example.com",
    });
  });

  it("reports a rejected request instead of throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "quotes@bharatreefer.com");
    fetchMock.mockResolvedValue(new Response('{"message":"Domain not verified"}', { status: 403 }));
    const sendEmail = await loadSendEmail();

    expect(await sendEmail(message)).toEqual({
      status: "failed",
      reason: 'Resend responded 403: {"message":"Domain not verified"}',
    });
  });

  it("reports a network failure instead of throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "quotes@bharatreefer.com");
    fetchMock.mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.resend.com"));
    const sendEmail = await loadSendEmail();

    expect(await sendEmail(message)).toEqual({
      status: "failed",
      reason: "getaddrinfo ENOTFOUND api.resend.com",
    });
  });
});
