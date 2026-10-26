import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // The panel at /desk is left out on purpose: listing it here would advertise it. Its pages
    // send noindex themselves.
    rules: { userAgent: "*", allow: "/", disallow: ["/api"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
