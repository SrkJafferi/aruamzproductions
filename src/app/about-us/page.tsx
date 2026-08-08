import type { Metadata } from "next";
import { AboutHero } from "@/components/sections/about-hero";
import { AboutWhoWeAre } from "@/components/sections/about-who-we-are";
import { AboutPrinciples } from "@/components/sections/about-principles";
import { StatementBand } from "@/components/sections/statement-band";
import { AboutFeatured } from "@/components/sections/about-featured";
import { CompanyFacts } from "@/components/sections/company-facts";
import { Testimonials } from "@/components/sections/testimonials";
import { Newsletter } from "@/components/sections/newsletter";
import { aboutCraft, aboutResults, aboutWhoWeAre } from "@/content/about";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About Us",
  /* The legacy page's own opening statement, run together into one sentence for
     the meta description — no new claim is introduced. */
  description:
    "Aruamz Productions is a production company based in Karachi with an expertise team making ad films, documentaries and short films for top brands and agencies.",
  alternates: { canonical: "/about-us" },
  openGraph: {
    type: "website",
    url: `${site.url}/about-us`,
    title: `About Us — ${site.name}`,
    description: aboutWhoWeAre.body,
  },
};

/** Breadcrumb + page schema. Mirrors the organisation schema in `layout.tsx`. */
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${site.url}/about-us`,
      url: `${site.url}/about-us`,
      name: `About Us — ${site.name}`,
      description: aboutWhoWeAre.body,
      isPartOf: { "@type": "WebSite", url: site.url, name: site.name },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        { "@type": "ListItem", position: 2, name: "About Us", item: `${site.url}/about-us` },
      ],
    },
  ],
};

/**
 * Section order is the legacy About page's own order, unchanged:
 * hero → who we are → what we make → featured projects → why it works →
 * company facts → testimonials → newsletter.
 *
 * The one addition is the overview/mission pair, which the client approved for
 * this page after it came off the homepage. It is placed after "Who we are" so
 * the page answers who, then what it stands on, then what it makes.
 */
export default function AboutUsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <AboutHero />
      <AboutWhoWeAre />
      <AboutPrinciples />
      <StatementBand
        id="about-craft"
        content={aboutCraft}
        icon="video"
        variant="split"
        plate="fixed"
      />
      <AboutFeatured />
      <StatementBand
        id="about-results"
        content={aboutResults}
        icon="results"
        variant="centred"
        cta={aboutResults.cta}
      />
      <CompanyFacts />
      <Testimonials />
      <Newsletter />
    </>
  );
}
