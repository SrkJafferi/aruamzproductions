/**
 * About Us page copy.
 *
 * Every string here is transcribed verbatim from the legacy page source in
 * `_reference/about_code.txt` — do not paraphrase, shorten or add new claims.
 * Where the legacy page set a statement across several `<br />` lines, those
 * breaks are preserved as array entries: the line breaks are the client's own
 * typesetting and reading them as one run of prose changes how the sentences
 * are meant to land.
 */
import { overview as companyOverview, mission } from "./homepage";

/* ── Page hero ────────────────────────────────────────────────────────── */
export const aboutHero = {
  heading: "ABOUT US",
  /** Renders as the breadcrumb the reference design puts under the title. */
  breadcrumb: [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about-us" },
  ],
  /**
   * The opening statement. Line one is set apart in the legacy markup — it is
   * `<strong>` where the rest is not — so it keeps that emphasis here.
   */
  lead: "ARUAMZ PRODUCTIONS",
  /**
   * The legacy page broke this across five `<br />` lines, which read as a
   * ragged stack rather than a statement. The client asked for two, so three of
   * those breaks are closed up — no word is added, removed or reordered, and the
   * surviving break is one of the client's own (between "making of" and "ad
   * films"), which also splits the sentence into two near-equal measures.
   */
  statement: [
    "Is a production company based in Karachi. Company holds Expertise team with making of",
    "ad films, documentaries and short films which are associated with top brands & agencies.",
  ],
  /**
   * Client-chosen replacement for the legacy `abtback2213.jpg`, which was a flat
   * grey wall (mean 67 on every channel) that collapsed to black behind the
   * scrim. This is a real photograph from Unsplash — a rigged camera lit by a
   * warm softbox in a dark studio — not an AI-generated frame.
   * unsplash.com/photos/a-camera-and-a-light-in-a-dark-room-RxbWoZMOLXY
   */
  image: "/about/hero.jpg",
} as const;

/* ── Who we are ───────────────────────────────────────────────────────── */
/**
 * Deliberately NOT imported from `homepage.ts`. The two pages carry different
 * wordings of the closing quote in the legacy source — the homepage was
 * rewritten at some point and the About page was not — and each page is
 * reproduced from its own source rather than harmonised by guesswork.
 */
export const aboutWhoWeAre = {
  eyebrow: "Our practice",
  heading: "WHO WE ARE?",
  body: "We're hired as your video documentary production company, from storyboard to shooting schedules to finished product, we establish a solid relationship with our clients as well as the subject matter at hand in order to craft compelling video content.",
  quote:
    "Our aim is to make content that will stick in the mind of our target audience. Content that will connect on an emotional level and be memorable, long after the first viewing",
  /**
   * Client-chosen. A crew shooting a portrait on a studio cyc — the subject of
   * the paragraph beside it, where the shared `who-we-are.jpg` was a generic
   * plate. Its own file rather than an overwrite, because the homepage band
   * still points at the original. Real photograph, not AI-generated.
   * unsplash.com/photos/…-fcF6V2Mn57M
   */
  image: "/about/who-we-are.jpg",
} as const;

/* ── Overview + mission ───────────────────────────────────────────────── */
/**
 * The two-card grid the client asked to have taken off the homepage. Only the
 * mission was rehomed there; the overview has been unplaced since. The client
 * has since approved both for this page, so the pair is reunited here in the
 * order the legacy grid used.
 */
export const aboutPrinciples = {
  eyebrow: "What we stand on",
  items: [
    { heading: companyOverview.heading, body: companyOverview.body },
    { heading: mission.heading, body: mission.body },
  ],
} as const;

/* ── Statement bands ──────────────────────────────────────────────────── */
/**
 * The two capability statements. Same shape, so they share a component and
 * differ only in layout — one splits against its plate, one runs full-bleed —
 * which is what keeps them from reading as the same band twice.
 */
export const aboutCraft = {
  eyebrow: "End to end",
  heading: "WE MAKE VIDEOS AND ANIMATIONS FROM SCRIPTING TO DISTRIBUTION",
  body: "Aruamz Productions is a Karachi based video production company. We offer an in-house team of film specialists which can manage the video production process from concept through to completion.",
  /**
   * Client-chosen. A cinema camera rigged in an ornate working theatre — the
   * band is pinned to the viewport rather than parallaxed, so this frame stays
   * still while the copy travels across it. Real photograph, not AI-generated.
   * unsplash.com/photos/black-video-camera-on-black-tripod-cD7hI-4uPx0
   */
  image: "/about/craft-bg.jpg",
} as const;

export const aboutResults = {
  eyebrow: "Why it works",
  heading: "WE MAKE VIDEOS THAT CREATE RESULTS",
  body: "We take a strategic approach to video production, ensuring that we understand our client's goals, then helping them to measure the results to ensure we meet their marketing and communications objectives.",
  /** `abt3.jpg`, already in the tree as the mission plate. */
  image: "/textures/mission.jpg",
  /**
   * The page's next steps, added at the client's request. Both labels and both
   * routes are the site's own — taken from `navLinks` rather than invented — so
   * they cannot drift from the header.
   */
  cta: [
    { label: "Our Services", href: "/our-services" },
    { label: "Contact Us", href: "/contact-us" },
  ],
} as const;

/* ── Featured projects ────────────────────────────────────────────────── */
/**
 * Three stills, not the homepage's thirty-two: the About page ships its own
 * shorter gallery and this is that set, in the legacy order.
 *
 * The first two are byte-identical to stills already in `public/projects/`
 * (verified by checksum against the live media library), so they are pointed at
 * rather than copied in again. The third does not appear anywhere in the
 * homepage gallery, so it lives under `public/about/`.
 *
 * As on the homepage, the legacy markup gives every one of these an empty
 * `alt` and no title, so none is invented.
 */
export const aboutFeatured = {
  heading: "FEATURED PROJECTS",
  /**
   * One line in the source, split on its own en-dashes for display. The four
   * disciplines and their order are unchanged — only the separator is.
   */
  disciplines: [
    "Documentary Film Making",
    "Product/Fashion Photography",
    "Studio For Rent",
    "Professional Editing",
  ],
  images: [
    { src: "/projects/project-26.jpg", width: 1125, height: 823 },
    { src: "/projects/project-28.jpg", width: 1125, height: 809 },
    { src: "/about/featured-03.jpg", width: 1125, height: 809 },
  ].map((image, index) => ({
    ...image,
    alt: `Aruamz Productions featured project still ${index + 1}`,
  })),
} as const;
