import type { Metadata } from "next";
import { ProjectsHero } from "@/components/sections/projects-hero";
import { ProjectsGallery } from "@/components/sections/projects-gallery";
import { CompanyFacts } from "@/components/sections/company-facts";
import { Testimonials } from "@/components/sections/testimonials";
import { Newsletter } from "@/components/sections/newsletter";
import { projectsGallery } from "@/content/projects";
import { site } from "@/content/site";

/* Built from what the page actually shows and from disciplines the client
   already publishes elsewhere on the site — no capability is claimed here that
   they have not claimed themselves. */
const description = `The Aruamz Productions project gallery — ${projectsGallery.images.length} stills from our documentary, photography and studio work in Karachi.`;

export const metadata: Metadata = {
  title: "Our Projects",
  description,
  alternates: { canonical: "/our-projects" },
  openGraph: {
    type: "website",
    url: `${site.url}/our-projects`,
    title: `Our Projects — ${site.name}`,
    description,
    images: [projectsGallery.images[0].src],
  },
};

/** Gallery + breadcrumb schema. Mirrors the graph on About and Our Services. */
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${site.url}/our-projects`,
      url: `${site.url}/our-projects`,
      name: `Our Projects — ${site.name}`,
      description,
      isPartOf: { "@type": "WebSite", url: site.url, name: site.name },
    },
    {
      "@type": "ImageGallery",
      name: projectsGallery.heading,
      /* Every still is credited to the client, which is the one thing the
         legacy markup does say about them (via the watermark and the upload
         library). Nothing is titled or captioned, so nothing is. */
      associatedMedia: projectsGallery.images.map((image) => ({
        "@type": "ImageObject",
        contentUrl: `${site.url}${image.src}`,
        width: image.width,
        height: image.height,
        creditText: site.name,
        creator: { "@type": "Organization", name: site.name, url: site.url },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        {
          "@type": "ListItem",
          position: 2,
          name: "Our Projects",
          item: `${site.url}/our-projects`,
        },
      ],
    },
  ],
};

/**
 * Section order is the legacy Our Projects page's own order, unchanged:
 * hero → "what we have done?" masonry → company facts → testimonials →
 * newsletter. The legacy page carries no statement band and none is added.
 */
export default function OurProjectsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <ProjectsHero />
      <ProjectsGallery />
      <CompanyFacts />
      <Testimonials />
      <Newsletter />
    </>
  );
}
