import { Hero } from "@/components/sections/hero";
import { CeoMessage } from "@/components/sections/ceo-message";
import { FeaturedProjects } from "@/components/sections/featured-projects";
import { WhoWeAre } from "@/components/sections/who-we-are";
import { Showreel } from "@/components/sections/showreel";
import { CompanyFacts } from "@/components/sections/company-facts";
import { Testimonials } from "@/components/sections/testimonials";
import { Newsletter } from "@/components/sections/newsletter";
import { Clients } from "@/components/sections/clients";

/**
 * Section order is the legacy homepage order, with one client-approved change:
 * the two-card overview grid that used to follow "Who we are" is gone, and the
 * mission it carried now sits beside that section instead.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <CeoMessage />
      <FeaturedProjects />
      <WhoWeAre />
      <Showreel />
      <CompanyFacts />
      <Testimonials />
      <Newsletter />
      <Clients />
    </>
  );
}
