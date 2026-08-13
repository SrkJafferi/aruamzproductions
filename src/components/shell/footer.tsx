import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { socialIcons } from "@/components/icons/social";
import {
  brand,
  contact,
  copyright,
  footerCopy,
  navLinks,
  site,
  socials,
} from "@/content/site";

export function Footer() {
  return (
    <footer
      className="relative border-t"
      style={{ borderColor: "var(--hairline)", backgroundColor: "var(--bg-elevated)" }}
    >
      <div className="container-page py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1.2fr]">
          <div>
            <Link href="/" aria-label={`${site.name} — home`} className="inline-block">
              <Image
                src={brand.logo}
                alt={site.name}
                width={617}
                height={550}
                sizes="90px"
                className="h-16 w-auto"
              />
            </Link>
            <p
              className="mt-6 max-w-sm text-sm leading-relaxed"
              style={{ color: "var(--fg-muted)" }}
            >
              A media house by {site.founder}.
              <br />
              {site.tagline}.
            </p>
            <p
              className="mt-3 max-w-sm text-sm leading-relaxed"
              style={{ color: "var(--fg-muted)" }}
            >
              {footerCopy.partners}
            </p>
            <ul className="mt-7 flex gap-3">
              {socials.map((social) => {
                const Icon = socialIcons[social.label];
                return (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      /* The glyph is aria-hidden, so the name lives here — and it
                         says where the link goes, not just which brand it is. */
                      aria-label={`${site.name} on ${social.label}`}
                      className="icon-button"
                    >
                      {Icon ? (
                        <Icon className="size-[1.125rem]" />
                      ) : (
                        /* A social added to the content file without a matching
                           mark still renders something clickable rather than an
                           empty circle. */
                        <span aria-hidden className="font-mono text-xs">
                          {social.label.charAt(0)}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <nav aria-label="Footer">
            <h2 className="eyebrow">Navigate</h2>
            <ul className="mt-6 space-y-3">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm transition-colors duration-300 hover:text-[var(--accent)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow">{contact.label}</h2>
            <ul className="mt-6 space-y-4 text-sm">
              <li className="flex gap-3">
                <MapPin
                  className="mt-0.5 size-4 shrink-0"
                  style={{ color: "var(--accent)" }}
                  aria-hidden
                />
                <address className="not-italic" style={{ color: "var(--fg-muted)" }}>
                  {contact.street}
                  <br />
                  {contact.city}, {contact.country}
                </address>
              </li>
              <li className="flex gap-3">
                <Mail className="size-4 shrink-0" style={{ color: "var(--accent)" }} aria-hidden />
                <a
                  href={`mailto:${contact.email}`}
                  className="transition-colors duration-300 hover:text-[var(--accent)]"
                >
                  {contact.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="size-4 shrink-0" style={{ color: "var(--accent)" }} aria-hidden />
                <a
                  href={contact.phoneHref}
                  className="transition-colors duration-300 hover:text-[var(--accent)]"
                >
                  {contact.phone}
                </a>
              </li>
            </ul>

            {/* The supplied code is gold on an opaque white ground, so it needs no
                plate of its own — but it does need the hairline, or its white
                edge dissolves into the light theme's white footer. */}
            <div className="mt-8 flex items-center gap-4">
              <Image
                src={brand.qr}
                alt={footerCopy.qrAlt}
                width={1147}
                height={1147}
                /* 112px, not the 96 this slot would otherwise take: a phone camera
                   has to resolve individual modules off a screen, and below about
                   this size they smudge together and the code stops scanning. */
                sizes="112px"
                className="size-28 shrink-0 rounded-lg border p-1"
                style={{ borderColor: "var(--hairline-strong)", backgroundColor: "#ffffff" }}
              />
              <p className="eyebrow">{footerCopy.qrLabel}</p>
            </div>
          </div>
        </div>

        <div
          className="mt-14 flex flex-col gap-2 border-t pt-8 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--hairline)", color: "var(--fg-muted)" }}
        >
          <p>{copyright.line}</p>
          <p>{copyright.rights}</p>
        </div>
      </div>
    </footer>
  );
}
