import { describe, expect, it } from "vitest";
import { DEFAULT_BANDS } from "@/config/materials";
import { DEFAULT_BUSINESS } from "@/config/site";
import { whatsappLink } from "@/lib/whatsapp";
import {
  customerConfirmationEmail,
  dispatchNotificationEmail,
  type QuoteEmailData,
} from "./emails";
import { customerWhatsappMessage, dispatchWhatsappMessage } from "./messages";

const context = { business: DEFAULT_BUSINESS, bands: DEFAULT_BANDS };
const labels = { FROZEN: "Frozen", CHILLED: "Chilled", AMBIENT: "Normal" };

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
  pickupDate: "2026-10-12",
  notes: "Ice cream, 600 cartons.\nLoading after 6 PM.",
  contactName: "Asha Verma",
  phone: "+919871094268",
  email: "asha@example.com",
};

const ADMIN_URL = "https://bharatreefer.com/desk/quotes/abc123";

describe("dispatchNotificationEmail", () => {
  const email = dispatchNotificationEmail(quote, context, ADMIN_URL);

  it("puts the essentials in the subject line", () => {
    expect(email.subject).toBe(
      "New quote request BR-7K3Q9F: Ludhiana to Mumbai, 12,500 kg frozen",
    );
  });

  it("includes the customer, the load and the admin link in both versions", () => {
    for (const body of [email.html, email.text]) {
      expect(body).toContain("Asha Verma");
      expect(body).toContain("+91 98710 94268");
      expect(body).toContain("asha@example.com");
      expect(body).toContain("Ludhiana, Punjab");
      expect(body).toContain("12,500 kg");
      expect(body).toContain("1 × 16 t, full load");
      expect(body).toContain("12 Oct 2026");
      expect(body).toContain(ADMIN_URL);
    }
  });

  it("says the request came from the website, or who entered it for the customer", () => {
    expect(email.text).toContain("Asha Verma asked for a quote from the website.");
    const entered = dispatchNotificationEmail({ ...quote, createdBy: "Priya Sharma (staff)" }, context, ADMIN_URL);
    expect(entered.text).toContain("Priya Sharma (staff) entered this request for Asha Verma.");
    expect(entered.text).not.toContain("from the website");
  });

  it("names the promo code and whose it is, when one was given", () => {
    expect(email.text).not.toContain("Promo code:");
    const credited = dispatchNotificationEmail({ ...quote, promoCode: "PRIYA (Priya Sharma)" }, context, ADMIN_URL);
    expect(credited.text).toContain("Promo code: PRIYA (Priya Sharma)");
    expect(credited.html).toContain("PRIYA (Priya Sharma)");
  });

  it("keeps line breaks in the customer's notes", () => {
    expect(email.html).toContain("Ice cream, 600 cartons.<br>Loading after 6 PM.");
  });

  it("says how to reach a customer who left no email", () => {
    const withoutEmail = dispatchNotificationEmail({ ...quote, email: null }, context, ADMIN_URL);
    expect(withoutEmail.text).not.toContain("Email:");
    expect(withoutEmail.text).toContain("did not leave an email address");
  });

  it("escapes anything the customer typed", () => {
    const hostile = dispatchNotificationEmail(
      {
        ...quote,
        contactName: '<img src=x onerror="alert(1)">',
        notes: "</td><script>alert(2)</script>",
      },
      context,
      ADMIN_URL,
    );
    expect(hostile.html).not.toContain("<img");
    expect(hostile.html).not.toContain("<script");
    expect(hostile.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});

describe("customerConfirmationEmail", () => {
  const email = customerConfirmationEmail(quote, context);

  it("confirms the reference and what happens next", () => {
    expect(email.subject).toBe("We received your quote request BR-7K3Q9F");
    expect(email.text).toContain("Reference: BR-7K3Q9F");
    expect(email.text).toContain("within 24 hours");
    expect(email.text).toContain("98710 94268");
    expect(email.text).toContain("Mon to Sat, 8:00 AM to 8:00 PM");
  });

  it("uses the business name the admin set", () => {
    const renamed = customerConfirmationEmail(quote, {
      ...context,
      business: { ...DEFAULT_BUSINESS, name: "Arctic Lines" },
    });
    expect(renamed.html).toContain("Arctic Lines");
  });

  it("does not expose the admin panel or repeat the customer's own contact details", () => {
    expect(email.html).not.toContain("/desk");
    expect(email.text).not.toContain("asha@example.com");
  });
});

describe("WhatsApp messages", () => {
  it("lets a customer open a chat that already names their request", () => {
    expect(customerWhatsappMessage(quote, labels)).toBe(
      "Hello, I sent quote request BR-7K3Q9F on your website (Ludhiana to Mumbai, 12,500 kg frozen).",
    );
  });

  it("includes the quote once dispatch has entered one", () => {
    const base = { ...quote, quotedAmount: null };
    expect(dispatchWhatsappMessage(base, "Bharat Reefer", labels)).toBe(
      "Hello Asha Verma, this is Bharat Reefer about your quote request BR-7K3Q9F (Ludhiana to Mumbai, 12,500 kg frozen).",
    );
    expect(dispatchWhatsappMessage({ ...base, quotedAmount: 148_500 }, "Bharat Reefer", labels)).toContain(
      "Our quote for this load is ₹1,48,500.",
    );
  });

  it("builds a wa.me link with the number and an encoded message", () => {
    expect(whatsappLink("+91 98710 94268", "Hello & welcome")).toBe(
      "https://wa.me/919871094268?text=Hello%20%26%20welcome",
    );
  });
});
