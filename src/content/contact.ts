/**
 * Contact Us page copy.
 *
 * The legacy page (`_reference/contact_us_code.txt`) is unusually thin: a 260px
 * `banner4.jpg` strip with no heading at all, a Contact Form 7 shortcode whose
 * field markup is not in the export, an "Our Office" column, and a 580px Google
 * map. So the content model here is exactly that — nothing about the company is
 * added, and every address, email and phone number is read from `site.contact`
 * rather than re-typed, so this page can never drift from the footer.
 *
 * The one thing invented is the *form's own furniture* — labels, placeholders
 * and validation messages. The legacy export carries no field markup, so there
 * is nothing to transcribe; these are UI strings, not company claims.
 */

import { services } from "./services";
import { contact as office, site } from "./site";

/* ── Page hero ────────────────────────────────────────────────────────── */
/**
 * The legacy page has no `<h1>` — only a banner strip and an `<h2>Our Office</h2>`
 * further down. The heading below is the page's own name, taken from its
 * `<title>` ("… | Contact us") and from the nav, so the interior pages all open
 * the same way. No new claim is made by it.
 */
export const contactHero = {
  heading: "Contact Us",
  breadcrumb: [
    { label: "Home", href: "/" },
    { label: "Contact Us", href: "/contact-us" },
  ],
  /**
   * Replaces `banner4.jpg`, a 260px strip that cannot carry a full-height hero.
   * Karachi from the air at night — the city the office is actually in, and its
   * amber street grid sits in the same range as `--accent`. Real photograph,
   * not AI-generated. unsplash.com/photos/uZF3nuUiGUk
   */
  image: "/contact/hero.jpg",
  cta: { label: "Start a conversation", href: "#contact-form" },
} as const;

/* ── The form ─────────────────────────────────────────────────────────── */
/**
 * The legacy shortcode is Contact Form 7 posting back to WordPress. There is no
 * WordPress here and no mail service is configured, so the form composes what
 * was typed and hands it to a channel the client already runs: WhatsApp as the
 * primary send, e-mail as the fallback. Nothing is silently dropped — a visitor
 * always ends up in an app with their message already written out.
 */

/** Title-cases the three service headings the old editor left in capitals. */
const subjectLabel = (heading: string) =>
  heading === heading.toUpperCase()
    ? heading.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
    : heading;

export const contactForm = {
  eyebrow: "Send a message",
  heading: "Tell us about your project",
  /** Plain instruction, not a claim about response times or availability. */
  intro:
    "Fill in the form and it will open in WhatsApp with your message ready to send — or send the same details by e-mail instead.",
  fields: {
    name: { label: "Your name", placeholder: "e.g. Ayesha Khan" },
    email: { label: "E-mail", placeholder: "you@company.com" },
    phone: { label: "Phone", placeholder: "+92 300 0000000", optional: true },
    subject: { label: "What is it about?" },
    message: {
      label: "Your message",
      placeholder: "A few lines about what you have in mind…",
    },
  },
  /** The six services the client publishes, plus an escape hatch. */
  subjects: [
    ...services.items.map((item) => subjectLabel(item.heading)),
    "Something else",
  ],
  submit: "Send on WhatsApp",
  alternate: "Send by e-mail",
  /** Shown once a channel has been handed the message. */
  success: "Your message is ready — finish sending it in the app that just opened.",
} as const;

/* ── Our Office ───────────────────────────────────────────────────────── */
/**
 * `office.label` is the legacy page's only heading, "Our Office", kept verbatim.
 * The rows below are the same three the legacy `q_icon_list` carries — address,
 * e-mail, phone — with the WhatsApp number the client added to the site later.
 */
export const contactOffice = {
  heading: office.label,
  street: office.street,
  city: `${office.city}, ${office.country}`,
  rows: [
    {
      key: "address",
      icon: "map-pin",
      label: "Address",
      value: office.addressLine,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.addressLine)}`,
      external: true,
    },
    {
      key: "email",
      icon: "mail",
      label: "E-mail",
      value: office.email,
      href: `mailto:${office.email}`,
      external: false,
    },
    {
      key: "phone",
      icon: "phone",
      label: "Phone",
      value: office.phone,
      href: office.phoneHref,
      external: false,
    },
    {
      key: "whatsapp",
      icon: "whatsapp",
      label: "WhatsApp",
      value: office.whatsappDisplay,
      href: `https://wa.me/${office.whatsapp}`,
      external: true,
    },
  ],
  socialsLabel: "Follow",
} as const;

/* ── The map ──────────────────────────────────────────────────────────── */
/**
 * The legacy map is a `qode_google_map` shortcode loading the Maps JS API with
 * the client's own browser key — that key is domain-restricted and would fail
 * here, and shipping it in a public bundle would be careless besides. Google's
 * keyless `output=embed` endpoint shows the same place with no key at all, so
 * the map is geocoded from the one address the site already stores.
 */
export const contactMap = {
  /** The section has no visible heading on the legacy page, so it has none here. */
  label: `${site.name} on the map`,
  query: office.addressLine,
  zoom: office.mapZoom,
  embed: `https://www.google.com/maps?q=${encodeURIComponent(office.addressLine)}&z=${office.mapZoom}&hl=en&output=embed`,
  directions: {
    label: "Get directions",
    href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(office.addressLine)}`,
  },
} as const;
