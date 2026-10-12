import type { OpeningHours } from "@/lib/hours";

/** Business details shown across the site. Editable in the admin panel; these are the defaults. */
export type BusinessInfo = {
  name: string;
  tagline: string;
  /** E.164, e.g. "+919871094268". */
  phone: string;
  /** E.164. Null hides the WhatsApp links. */
  whatsapp: string | null;
  /** Public contact address. */
  email: string;
  /** Where new-request alerts go. Null means the public email. */
  alertEmail: string | null;
  address: {
    street: string;
    city: string;
    region: string;
  };
  hours: OpeningHours;
  /** How quickly dispatch commits to answering a quote request. */
  responseTime: string;
};

export const DEFAULT_BUSINESS: BusinessInfo = {
  name: "Bharat Reefer",
  tagline: "Refrigerated road transport",
  phone: "+919871094268",
  whatsapp: "+919871094268",
  email: "dispatch@vracoolcarriers.in",
  alertEmail: null,
  address: {
    street: "Sector-17, Rohini",
    city: "Delhi",
    region: "Delhi",
  },
  hours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "08:00",
    closes: "20:00",
  },
  responseTime: "24 hours",
};

/** Public origin of the site, without a trailing slash. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/+$/, "");
