/**
 * Company-wide constants. Every string here is taken verbatim from the legacy
 * site source in `_reference/` — do not paraphrase or add new claims.
 */
export const site = {
  name: "Aruamz Productions",
  tagline: "We turn stories into visuals",
  title: "Aruamz Productions - We turn stories into visuals",
  url: "https://aruamzproductions.com",
  founder: "Syeda Zahra Shah",
  established: "2017",
  locale: "en_PK",
} as const;

export const contact = {
  label: "Our Office",
  street: "410 Burhani Chamber Saddar Abdullah Haroon Road",
  city: "Karachi",
  country: "Pakistan",
  addressLine: "410 Burhani Chamber Saddar Abdullah Haroon Road, Karachi, Pakistan",
  email: "aruamzproductions@gmail.com",
  phone: "(021) 32751847",
  phoneHref: "tel:+922132751847",
  mapZoom: 17,
  /**
   * Supplied by the client as +92 331 2220136. Stored digits-only with the
   * country code because that is the only form `wa.me` accepts — a leading `+`
   * or any spacing gives a "phone number shared via url is invalid" page.
   */
  whatsapp: "923312220136",
  whatsappDisplay: "+92 331 2220136",
  /**
   * Pre-filled chat message. The dock URL-encodes this into the wa.me link, so
   * the visitor lands with the enquiry already typed. Kept here rather than in
   * the component so the client can reword it in one place.
   */
  whatsappMessage:
    "Hello Aruamz Productions! I came across your website and I'd like to discuss a project with you.",
} as const;

export const socials = [
  { label: "Facebook", href: "https://facebook.com/aruamzproductions/" },
  { label: "Instagram", href: "https://www.instagram.com/isyedazahrashah/" },
] as const;

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Our Services", href: "/our-services" },
  { label: "Our Projects", href: "/our-projects" },
  { label: "Contact Us", href: "/contact-us" },
] as const;

export const copyright = {
  line: `Copyright © ${new Date().getFullYear()} Aruamz Productions`,
  rights: "All Rights Reserved.",
} as const;

export const brand = {
  logo: "/brand/logo.png",
  /* Client supplied this replacement portrait directly (1254x1254, up from the
     432px legacy PNG, which is kept alongside it in `public/brand/`). */
  ceoPortrait: "/brand/ceo-portrait.avif",
  ceoSignature: "/brand/ceo-signature.png",
  showreelPoster: "/brand/showreel-poster.png",
  /** Square, 1147x1147. Supplied by the client for the footer. */
  qr: "/aruamzQR.avif",
} as const;

/**
 * Footer blurb. The second sentence was supplied directly by the client for the
 * footer — it is not in the legacy `_reference/` source, so it is recorded here
 * verbatim rather than being rewritten to match the surrounding voice.
 */
export const footerCopy = {
  partners:
    "We continue to partner with other production companies to develop and produce projects across a wide range of genres.",
  /* Deliberately does not claim what scanning it does. Nobody has said whether
     the code points at the website, a WhatsApp thread or a vCard, and a label
     that names the wrong destination is worse than one that names none. */
  qrLabel: "Scan to connect",
  qrAlt: "QR code for Aruamz Productions",
} as const;
