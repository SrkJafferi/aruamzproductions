import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/**
 * Only the homepage exists so far. As About / Services / Projects / Contact
 * ship, add their routes here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
