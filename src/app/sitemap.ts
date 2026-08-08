import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/**
 * Every route the site publishes. Home, About, Our Services, Our Projects and
 * Contact are all live.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: site.url,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${site.url}/about-us`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${site.url}/our-services`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.9,
    },
    {
      url: `${site.url}/our-projects`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${site.url}/contact-us`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.8,
    },
  ];
}
