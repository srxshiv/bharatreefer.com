import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/quote`, changeFrequency: "monthly", priority: 0.9 },
  ];
}
