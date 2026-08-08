import type { Metadata } from "next";
import { ContactHero } from "@/components/sections/contact-hero";
import { ContactMain } from "@/components/sections/contact-main";
import { ContactMap } from "@/components/sections/contact-map";
import { contactHero } from "@/content/contact";
import { contact as office, site, socials } from "@/content/site";

/* Says only what the page shows: where the office is and how to reach it. */
const description = `Contact Aruamz Productions — ${office.addressLine}. Call ${office.phone}, message us on WhatsApp or e-mail ${office.email}.`;

export const metadata: Metadata = {
  title: "Contact Us",
  description,
  alternates: { canonical: "/contact-us" },
  openGraph: {
    type: "website",
    url: `${site.url}/contact-us`,
    title: `Contact Us — ${site.name}`,
    description,
    images: [contactHero.image],
  },
};

/**
 * Contact + organisation schema. Every value is read from `site.contact`, so
 * the structured data cannot drift from what the page prints — and nothing is
 * asserted here that is not visible on the page itself.
 */
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ContactPage",
      "@id": `${site.url}/contact-us`,
      url: `${site.url}/contact-us`,
      name: `Contact Us — ${site.name}`,
      description,
      isPartOf: { "@type": "WebSite", url: site.url, name: site.name },
    },
    {
      "@type": "Organization",
      "@id": `${site.url}#organization`,
      name: site.name,
      url: site.url,
      email: office.email,
      telephone: office.phone,
      sameAs: socials.map((social) => social.href),
      address: {
        "@type": "PostalAddress",
        streetAddress: office.street,
        addressLocality: office.city,
        addressCountry: "PK",
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: office.phone,
          email: office.email,
          areaServed: "PK",
          availableLanguage: ["en", "ur"],
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        {
          "@type": "ListItem",
          position: 2,
          name: "Contact Us",
          item: `${site.url}/contact-us`,
        },
      ],
    },
  ],
};

/**
 * The legacy Contact page's own flow, unchanged: banner → form beside "Our
 * Office" → map. It carries no Company Facts band and no newsletter, and none
 * is added.
 */
export default function ContactUsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <ContactHero />
      <ContactMain />
      <ContactMap />
    </>
  );
}
