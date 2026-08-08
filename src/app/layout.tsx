import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { ThemeProvider, themeScript } from "@/components/providers/theme-provider";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { Loader } from "@/components/shell/loader";
import { Cursor } from "@/components/shell/cursor";
import { ScrollProgress } from "@/components/shell/scroll-progress";
import { Navbar } from "@/components/shell/navbar";
import { Footer } from "@/components/shell/footer";
import { FloatingDock } from "@/components/shell/floating-dock";
import { contact, site } from "@/content/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s — ${site.name}` },
  description:
    "Aruamz Productions is a media house by Syeda Zahra Shah. From storyboard to shooting schedules to finished product, we craft compelling video content.",
  applicationName: site.name,
  keywords: [
    "Aruamz Productions",
    "video production Karachi",
    "documentary film production",
    "media house Pakistan",
    "Syeda Zahra Shah",
  ],
  authors: [{ name: site.founder }],
  creator: site.founder,
  publisher: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title: site.title,
    description:
      "A media house by Syeda Zahra Shah. We turn stories into visuals — documentary, film and digital production out of Karachi.",
    locale: site.locale,
    images: [
      {
        url: "/brand/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${site.name} showreel`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.tagline,
    images: ["/brand/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080808" },
    { media: "(prefers-color-scheme: light)", color: "#F7F6F3" },
  ],
  colorScheme: "dark light",
};

/** Organisation schema — every value is taken from the legacy site source. */
const organisationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.url,
  logo: `${site.url}/brand/logo.png`,
  description: site.tagline,
  foundingDate: site.established,
  founder: { "@type": "Person", name: site.founder },
  email: contact.email,
  telephone: contact.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: contact.street,
    addressLocality: contact.city,
    addressCountry: contact.country,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* The font variables must sit on <html>: Tailwind declares --font-display
       and friends on :root, and a var() there can only see custom properties
       defined on that same element. On <body> they resolve to nothing and every
       heading silently falls back to the system stack. */
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        {/* The hero video now lives on jsDelivr. Without this the connection is
            only opened when the <video> element is parsed, putting a DNS lookup
            and a TLS handshake in front of the first frame. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationSchema) }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>

          <Loader />
          <SmoothScroll />
          <Cursor />
          <ScrollProgress />
          <Navbar />

          <main id="main">{children}</main>

          <Footer />
          <FloatingDock />
        </ThemeProvider>
      </body>
    </html>
  );
}
