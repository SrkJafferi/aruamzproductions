"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { contact, navLinks, socials } from "@/content/site";
import { registerGsap } from "@/lib/gsap";

type Props = { open: boolean; onClose: () => void };

/** Fullscreen overlay menu with focus trapping and Escape-to-close. */
export function MobileNav({ open, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;

      const focusable = panel.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    const root = panel.current;
    if (!open || !root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gsap = registerGsap();
    const ctx = gsap.context(() => {
      gsap.from("[data-nav-item]", {
        y: 34,
        opacity: 0,
        duration: 0.7,
        stagger: 0.06,
        ease: "power3.out",
      });
    }, root);
    return () => ctx.revert();
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      className="fixed inset-0 z-[130] flex flex-col lg:hidden"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="flex h-[72px] items-center justify-end px-5 sm:px-8">
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="icon-button"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center px-6 sm:px-8">
        <ul className="space-y-1">
          {navLinks.map((item, index) => (
            <li key={item.href} data-nav-item>
              <Link
                href={item.href}
                onClick={onClose}
                className="group flex items-baseline gap-4 py-3"
              >
                <span
                  className="font-mono text-[0.6875rem] tracking-[0.28em]"
                  style={{ color: "var(--accent)" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-[2rem] leading-none tracking-tight transition-colors duration-300 group-hover:text-[var(--accent)] sm:text-[2.5rem]">
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div
        data-nav-item
        className="space-y-4 border-t px-6 py-8 sm:px-8"
        style={{ borderColor: "var(--hairline)" }}
      >
        <a href={`mailto:${contact.email}`} className="block text-sm">
          {contact.email}
        </a>
        <a href={contact.phoneHref} className="block text-sm">
          {contact.phone}
        </a>
        <div className="flex gap-5 pt-1">
          {socials.map((social) => (
            <a
              key={social.href}
              href={social.href}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-[0.6875rem] tracking-[0.24em] uppercase"
              style={{ color: "var(--fg-muted)" }}
            >
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
