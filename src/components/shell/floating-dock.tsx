"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Mail, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/social";
import { contact } from "@/content/site";

/**
 * Contact shortcuts in the bottom-right corner. WhatsApp is always present once
 * `contact.whatsapp` is filled in; the rest fade in once the hero is behind the
 * visitor.
 */
export function FloatingDock() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toTop = () => {
    if (window.__lenis) window.__lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed right-4 bottom-4 z-[115] flex flex-col gap-2.5 sm:right-6 sm:bottom-6">
      {/* The utilities are still gated on the hero being behind the visitor, but
          they now sit in their own group *above* WhatsApp and only fade — the
          space stays reserved, so the green button never shifts under a thumb
          that is already reaching for it. */}
      <div
        className="flex flex-col gap-2.5 transition-all duration-500"
        style={{
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(12px)",
          pointerEvents: shown ? "auto" : "none",
        }}
        aria-hidden={!shown}
      >
        <a href={contact.phoneHref} aria-label={`Call ${contact.phone}`} className="dock-button">
          <Phone className="size-4" />
        </a>

        <a
          href={`mailto:${contact.email}`}
          aria-label={`Email ${contact.email}`}
          className="dock-button"
        >
          <Mail className="size-4" />
        </a>

        <button type="button" onClick={toTop} aria-label="Back to top" className="dock-button">
          <ArrowUp className="size-4" />
        </button>
      </div>

      {/* Never gated. A contact shortcut that is missing for the whole first
          screen is not a contact shortcut. */}
      {contact.whatsapp ? (
        <a
          /* encodeURIComponent, not a raw string: the apostrophe in "I'd"
             survives either way, but a future edit adding an `&` or `#` would
             silently truncate the message at that character. */
          href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(contact.whatsappMessage)}`}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Chat on WhatsApp: ${contact.whatsappDisplay}`}
          data-whatsapp
          className="dock-button"
          /* The one button in the stack that does not wear the site palette.
             A gold-on-glass WhatsApp mark would be prettier and would cost the
             thing its entire job — this is the action a visitor scans the
             corner for, and they scan for the green. Inline so it survives the
             utility's own colour declarations in either theme. */
          style={{
            backgroundColor: "#25d366",
            borderColor: "#25d366",
            color: "#ffffff",
            boxShadow: "0 6px 20px rgba(37, 211, 102, 0.32)",
          }}
        >
          <WhatsAppIcon className="size-[1.125rem]" />
        </a>
      ) : null}
    </div>
  );
}
