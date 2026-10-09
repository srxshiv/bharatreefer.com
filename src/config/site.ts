/**
 * Business details shown across the site. Change them here and every page,
 * metadata tag and structured-data block follows.
 */
export const site = {
  name: "Bharat Reefer",
  tagline: "Refrigerated road transport",
  description:
    "Refrigerated trucks from 900 kg to 22 tonnes for frozen, chilled and ambient cargo. Full load and part load across India. Request a quote and get a reply within 24 hours.",
  phone: {
    display: "98710 94268",
    e164: "+919871094268",
  },
  email: "dispatch@vracoolcarriers.in",
  /** Number customers can message on WhatsApp, in E.164. Set to null to hide the WhatsApp links. */
  whatsapp: "+919871094268" as string | null,
  hours: {
    // Non-breaking spaces keep the days and the times from splitting across lines.
    display: "Mon\u00a0to\u00a0Sat, 8:00\u00a0AM\u00a0to\u00a08:00\u00a0PM",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "08:00",
    closes: "20:00",
  },
  address: {
    street: "Sector-17, Rohini",
    city: "Delhi",
    region: "Delhi",
    country: "IN",
  },
  /** How quickly dispatch commits to answering a quote request. */
  responseTime: "24 hours",
} as const;

/** Public origin of the site, without a trailing slash. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/+$/, "");
