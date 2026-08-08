import type { Metadata } from "next";
import { ServicesHero } from "@/components/sections/services-hero";
import { ServicesGrid } from "@/components/sections/services-grid";
import { StatementBand } from "@/components/sections/statement-band";
import { CompanyFacts } from "@/components/sections/company-facts";
import { Testimonials } from "@/components/sections/testimonials";
import { Newsletter } from "@/components/sections/newsletter";
import { services, servicesDocumentary, servicesDreams } from "@/content/services";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Our Services",
  /* Built from the six service headings the page itself lists — no capability
     is claimed here that the page does not already carry. */
  description:
    "Corporate documentary, photography, studio for rent, creative strategy, video production and digital advertising — from scripting to distribution, by Aruamz Productions in Karachi.",
  alternates: { canonical: "/our-services" },
  openGraph: {
    type: "website",
    url: `${site.url}/our-services`,
    title: `Our Services — ${site.name}`,
    description: servicesDreams.body,
  },
};

/** Service list + breadcrumb schema. Mirrors the graph in `about-us/page.tsx`. */
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${site.url}/our-services`,
      url: `${site.url}/our-services`,
      name: `Our Services — ${site.name}`,
      description: servicesDreams.body,
      isPartOf: { "@type": "WebSite", url: site.url, name: site.name },
    },
    {
      "@type": "ItemList",
      name: services.heading,
      itemListElement: services.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Service",
          name: item.heading,
          description: item.body,
          serviceType: item.heading,
          provider: { "@type": "Organization", name: site.name, url: site.url },
          areaServed: { "@type": "City", name: "Karachi" },
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        {
          "@type": "ListItem",
          position: 2,
          name: "Our Services",
          item: `${site.url}/our-services`,
        },
      ],
    },
  ],
};

/**
 * Section order is the legacy Our Services page's own order, unchanged:
 * hero → what we do → "we transform dreams into reality" → "documentaries make
 * for great marketing tools" → company facts → testimonials → newsletter.
 *
 * The two statement bands share the About page's component. One splits against
 * its plate and one runs centred, which is what stops two consecutive
 * full-bleed quotes from reading as the same band twice.
 */
export default function OurServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <ServicesHero />
      <ServicesGrid />
      <StatementBand
        id="services-dreams"
        content={servicesDreams}
        icon="dreams"
        variant="split"
        plate="fixed"
      />
      <StatementBand
        id="services-documentary"
        content={servicesDocumentary}
        icon="documentary"
        variant="centred"
        cta={servicesDocumentary.cta}
      />
      <CompanyFacts />
      <Testimonials />
      <Newsletter />
    </>
  );
}
