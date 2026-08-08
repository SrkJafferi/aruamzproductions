import assets from "./assets.json";
import { contact, site } from "./site";

type Asset = { key: string; group: string; src: string; width: number; height: number };

const byGroup = (group: string) =>
  (assets as Asset[]).filter((asset) => asset.group === group);

/* ── Hero ─────────────────────────────────────────────────────────────── */
export const hero = {
  eyebrow: "A MEDIA HOUSE BY SYEDA ZAHRA SHAH",
  headline: "ARUAMZ PRODUCTIONS",
  tagline: "We turn stories into visuals",
  /**
   * The client's own showreel clip, served from their jsDelivr-backed GitHub
   * repo as VP9/WebM.
   *
   * The two mp4s are the same footage transcoded locally, not a different clip:
   * VP9 has no support on Safari before 14 or on iOS below 14.5, and a <source>
   * list is chosen on codec support alone, so anything left in the fallback slot
   * is what those visitors actually watch. `poster` is likewise a frame lifted
   * from this video — a poster from other footage flashes the wrong scene for
   * the moment before playback starts.
   */
  video: {
    webm: "https://cdn.jsdelivr.net/gh/SrkJafferi/aruamzproductions@main/herovideo.webm",
    hd: "/video/hero-hd.mp4",
    sd: "/video/hero-sd.mp4",
  },
  poster: "/video/hero-poster.jpg",
  scrollHint: "Scroll to explore",
  /**
   * The three laurel badges from the legacy hero, kept verbatim — same artwork,
   * same three disciplines, same order the client signed off on.
   */
  badges: [
    { label: "Documentaries", src: "/brand/badges/documentaries.png", width: 116, height: 100 },
    { label: "Short Films", src: "/brand/badges/short-films.png", width: 128, height: 101 },
    {
      label: "Digital Advertising",
      src: "/brand/badges/digital-advertising.png",
      width: 120,
      height: 102,
    },
  ],
  /** Marker line down the left rail — both values are from the legacy source. */
  marker: `EST. ${site.established} · ${contact.city.toUpperCase()}`,
} as const;

/* ── CEO message ──────────────────────────────────────────────────────── */
export const ceo = {
  eyebrow: "CEO MESSAGE",
  name: "SYEDA ZAHRA SHAH",
  body: "We turn stories into visuals. Opportunity exists and we strive to provide our clients with accurate, clear and intelligible a picture of their film as possible. Aruamz Productions is promising company as we highly believe in integrity and our aim is to believe, perceive and achieve.",
  portrait: { src: "/brand/ceo-portrait.avif", width: 1254, height: 1254 },
  signature: { src: "/brand/ceo-signature.png", width: 80, height: 58 },
  /**
   * Atmosphere behind the founder's message — a cinema camera rigged on a
   * tripod in a working studio (Pexels, photographed, not generated). Held at
   * low opacity and pinned to the viewport, so it reads as texture rather than
   * as a second photograph competing with the portrait.
   */
  backdrop: "/textures/ceo-backdrop.jpg",
} as const;

/* ── Featured projects ────────────────────────────────────────────────── */
export const featured = {
  eyebrow: "WELCOME TO Aruamz Productions",
  heading: "FEATURED PROJECTS",
  /**
   * The legacy gallery ships 32 stills with empty alt text and no titles or
   * categories, so none are invented here — the images speak for themselves.
   */
  images: byGroup("projects").map((asset, index) => ({
    ...asset,
    index: index + 1,
    alt: `Aruamz Productions project still ${index + 1}`,
  })),
} as const;

/* ── Who we are ───────────────────────────────────────────────────────── */
export const whoWeAre = {
  heading: "WHO WE ARE?",
  body: "We're hired as your video documentary production company, from storyboard to shooting schedules to finished product, we establish a solid relationship with our clients as well as the subject matter at hand in order to craft compelling video content.",
  quote:
    "Our goal is to create content that truly resonates with our audience—content that sparks emotion, leaves a lasting impression, and stays with them long after they've experienced it.",
  image: "/textures/who-we-are.jpg",
} as const;

/* ── Company overview + mission ───────────────────────────────────────── */
/**
 * Verbatim legacy copy, currently unplaced: the client asked for the two-card
 * overview grid to come off the homepage, and only the mission was rehomed
 * (beside "Who we are"). Kept here rather than deleted so it can go straight
 * onto the About page without being re-sourced.
 */
export const overview = {
  heading: "Company Overview",
  body: "All of our operations are designed by considering our customer's requirements. We ensure that our people are taken care of and provide rewards for good performance.",
} as const;

export const mission = {
  heading: "OUR MISSION",
  body: "Our main achievement is the consistency in our service. We do our work with honesty and hardwork which ensures that our customers return to do business with us.",
  image: "/textures/mission.jpg",
} as const;

/* ── Showreel ─────────────────────────────────────────────────────────── */
export const showreel = {
  /** The legacy section is an unlabelled video box; this is an a11y label only. */
  ariaLabel: "Aruamz Productions showreel",
  vimeoUrl: "https://vimeo.com/398084717",
  embedUrl: "https://player.vimeo.com/video/398084717?title=0&byline=0&portrait=0&dnt=1",
  poster: { src: "/brand/showreel-poster.png", width: 1920, height: 1080 },
} as const;

/* ── Company facts ────────────────────────────────────────────────────── */
export const facts = {
  heading: "Company Facts",
  sub: "Some quick facts and statistics about Aruamz Productions",
  /**
   * Atmosphere behind the figures — a crew rigging lights on an indoor set
   * (Pexels, photographed, not generated). Chosen against the founder's plate
   * rather than to match it: that one is a camera standing still, this one is
   * people working, which is what a band about staff, clients and project counts
   * is actually reporting.
   */
  backdrop: "/textures/facts-backdrop.jpg",
  items: [
    { value: 2017, label: "Established", plain: true },
    { value: 5, label: "Employees" },
    { value: 23, label: "Clients" },
    { value: 37, label: "Projects" },
  ],
} as const;

/* ── Testimonials ─────────────────────────────────────────────────────── */
export const testimonials = {
  heading: "What They Say",
  items: [
    {
      quote:
        "Zarah is one of those individuals who listens to and understands the needs of her clients. She takes in to account the feedback and does her best to satisfy her customers. I wish her the very best in her professional journey!",
      name: "Nadya Mistry",
      role: "CEO",
      avatar: "/testimonials/nadya-mistry.jpg",
    },
    {
      quote:
        "We've worked with Aruamz Productions on quite a few projects, mainly on digital animations. They are great to work with, and always deliver on budget and on time. They are flexible, accommodating, and take the time to understand our requirements.",
      name: "Ejaaz Khan",
      role: "Managing director TSA Clifton Campus",
      avatar: "/testimonials/ejaaz-khan.jpg",
    },
    {
      quote:
        "Zahra's deep history and understanding of film and video production, her strong work ethic, and sense of humor make it a pleasure to work with her on any project",
      name: "Syed Amjad Ali Shah",
      role: "CEO - Aruamz Associates",
      avatar: "/testimonials/syed-amjad-ali-shah.jpg",
    },
    {
      quote:
        "Zahra's competence, professionalism, intelligence, and mentoring spirit have made my experience of documentary film making so enjoyable and intellectually stimulating.",
      name: "Hassan Mehmood",
      role: "CEO HAMDAN REALM",
      avatar: "/testimonials/hassan-mehmood.jpg",
    },
    {
      quote:
        "I was looking for a film maker for my documentary feature film and found in Zahra Shah more than I knew I needed, wanted or thought possible. Zahra was a calm in the storm that is documentary filmmaking, and made this dream project of my lifetime better and more successful than I could ever have imagined.",
      name: "Fahad Jawaid",
      role: "Assistant manager talent acquisition (Engro Foods)",
      avatar: "/testimonials/fahad-jawaid.png",
    },
    {
      quote:
        "She is extremely knowledgeable, skilled, experienced and one of the most professional people I've worked with in the film industry.",
      name: "Syeda Uzma Shah",
      role: "Facility Executive (Engro Foods)",
      avatar: "/testimonials/syeda-uzma-shah.jpg",
    },
    {
      quote:
        "A difficult task but Zara you did a wonderful job! Really great working with Aruamz productions.",
      name: "Arooba",
      role: "Facilities executive (Engro Foods)",
      avatar: "/testimonials/arooba.jpg",
    },
  ],
} as const;

/* ── Newsletter ───────────────────────────────────────────────────────── */
export const newsletter = {
  eyebrow: "Get The Latest Updates",
  heading: "Subscribe For Our Newsletter",
  placeholder: "Your Email...",
  cta: "Subscribe",
} as const;

/* ── Client logos ─────────────────────────────────────────────────────── */
export const clients = {
  /** The legacy carousel carries no heading; this is an a11y label only. */
  ariaLabel: "Clients of Aruamz Productions",
  logos: byGroup("clients").map((logo, index) => ({
    ...logo,
    alt: `Client logo ${index + 1}`,
  })),
} as const;
