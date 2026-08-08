/**
 * Our Services page copy.
 *
 * Every string here is transcribed verbatim from the legacy page source in
 * `_reference/our_services_code.txt` — do not paraphrase, shorten or add new
 * claims. That includes the copy's own quirks: "potraits" and the lower-case
 * opening of the Digital Advertising paragraph are the client's, and are left
 * exactly as they are rather than silently corrected.
 *
 * The legacy page mixes its heading cases — three services are set in capitals
 * and three in title case. That is a styling accident of the old editor, not a
 * distinction, so the headings are stored as written and the casing is applied
 * in CSS where it can be uniform.
 */

/* ── Page hero ────────────────────────────────────────────────────────── */
export const servicesHero = {
  heading: "Work & Services",
  breadcrumb: [
    { label: "Home", href: "/" },
    { label: "Our Services", href: "/our-services" },
  ],
  /**
   * Client-chosen replacement for `banner01.jpg`, which was a 260px-tall strip
   * that cannot carry a full-height hero. A crew working around a camera on a
   * night set — real photograph, not AI-generated.
   * unsplash.com/photos/LP24lfRFKis
   */
  image: "/services/hero.jpg",
} as const;

/* ── What we do ───────────────────────────────────────────────────────── */
/**
 * The six services, in the legacy grid's order.
 *
 * Each carries an Unsplash photograph in place of the legacy `serv0*.jpg`
 * thumbnails, at the client's request. Every one is a real photograph — none is
 * AI-generated — and each was chosen to show the actual work the paragraph
 * beside it describes rather than a generic desk shot.
 */
export const services = {
  eyebrow: "Services",
  /**
   * The legacy page's own `<h4>` above the grid. It follows the H1 directly in
   * the source, so it stays the grid's heading here rather than repeating the
   * H1's "Work & Services" a second time on the same screen.
   */
  heading: "WHAT WE DO?",
  items: [
    {
      slug: "corporate-documentary",
      heading: "Corporate Documentary",
      body: "Corporate films can be a fantastic vehicle to bring your brand’s message to a larger audience.",
      image: "/services/documentary.jpg",
      alt: "A film crew gathered around a camera rig on a warehouse set",
    },
    {
      slug: "photography",
      heading: "PHOTOGRAPHY",
      body: "We have professional photographers to make your best portfolio and potraits",
      image: "/services/photography.jpg",
      alt: "A photographer shooting a model against a studio backdrop",
    },
    {
      slug: "studio-for-rent",
      heading: "STUDIO FOR RENT",
      body: "You can get your product photography and fashion shoot done in our studio",
      image: "/services/studio.jpg",
      alt: "An empty photography studio with lighting stands and a chair",
    },
    {
      slug: "creative-strategy",
      heading: "Creative Strategy",
      body: "Creative Strategies are the services that are designed to help our clients with one thing, their strategy. By following creative strategies you can add purpose to your product.",
      image: "/services/strategy.jpg",
      alt: "Hands arranging sticky notes across a printed journey map",
    },
    {
      slug: "video-production",
      heading: "Video Production",
      body: "Videos prove to be the best medium to gain people’s attention and deliver your message. Creating videos that change people’s perspective and affects them means your content is powerful.",
      image: "/services/video.jpg",
      alt: "A clapperboard held in front of a camera on set",
    },
    {
      slug: "digital-advertising",
      heading: "Digital Advertising",
      body: "specializes in providing marketing solutions to various clients. From brand awareness to targeted campaigns and marketing solutions along with media buying and product promotion.",
      image: "/services/advertising.jpg",
      alt: "Illuminated advertising screens on a city building at dusk",
    },
  ],
} as const;

/* ── Statement bands ──────────────────────────────────────────────────── */
/**
 * The legacy page sets both of these as a wide banner image with the heading
 * and paragraph stacked underneath. Here the banner becomes the band's own
 * plate so the two read as full-bleed sections rather than as two more cards —
 * the flow, and both strings, are unchanged.
 *
 * The curly quotes around the first heading are the client's own; they are kept
 * rather than normalised to straight quotes.
 */
export const servicesDreams = {
  eyebrow: "Our promise",
  heading: "“WE TRANSFORM DREAMS INTO REALITY”",
  body: "Creating engaging and interesting video is no easy feat. It requires the skills and expertise of an experienced production company that can understand your company’s mission and voice as well as how video content can be used to elevate your message. You need the help of a company that can guide you on how to incorporate educational video into your trainings or seminars to make them more effective.",
  /**
   * Replaces `serv7.jpg`, a 1246×340 strip. A working set under coloured light.
   * unsplash.com/photos/ycExgCMRggc
   */
  image: "/services/band-dreams.jpg",
} as const;

export const servicesDocumentary = {
  eyebrow: "Why documentary",
  heading: "“Documentaries Make For Great Marketing Tools”",
  body: "Corporate films can be a fantastic vehicle to bring your brand’s message to a larger audience. A documentary film demonstrating your company’s products, services, culture and so on can connect better with existing customers, with those unfamiliar with your brand, and even bring in new business today or in the future.",
  /**
   * Replaces `serv6.jpg`, likewise a strip. A documentary interview mid-setup.
   * unsplash.com/photos/AbuN0SklCeQ
   */
  image: "/services/band-documentary.jpg",
  /** Same pair of next steps the About page closes on. */
  cta: [
    { label: "Our Projects", href: "/our-projects" },
    { label: "Contact Us", href: "/contact-us" },
  ],
} as const;
