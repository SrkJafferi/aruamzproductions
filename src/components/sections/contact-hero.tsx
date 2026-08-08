"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronRight, MessagesSquare } from "lucide-react";
import { contactHero } from "@/content/contact";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { onAppReady } from "@/lib/app-ready";

export function ContactHero() {
  const root = useRef<HTMLElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.querySelectorAll<HTMLElement>("[data-ct-hero]").forEach((node) => {
        node.style.opacity = "1";
        node.style.transform = "none";
      });
      return;
    }

    const gsap = registerGsap();
    let stopIntro: (() => void) | undefined;

    const ctx = gsap.context(() => {
      gsap.to(plate.current, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });

      /* Type leaves; the scrim only fades. A full-bleed scrim that travels drags
         its own bottom edge into frame and uncovers the join into the next
         section — the same defect already fixed on every other hero. */
      gsap.to("[data-ct-hero-exit]", {
        opacity: 0,
        y: -34,
        ease: "none",
        scrollTrigger: { trigger: el, start: "45% top", end: "bottom top", scrub: true },
      });
      gsap.to("[data-ct-hero-scrim-fade]", {
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "45% top", end: "bottom top", scrub: true },
      });

      stopIntro = onAppReady(() =>
        ctx.add(() => {
          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

          tl.from(frame.current, { scale: 1.14, duration: 2, ease: "power3.out" })
            .from("[data-ct-title]", { yPercent: 116, duration: 1.4, ease: "expo.out" }, 0.2)
            .from("[data-ct-crumb]", { y: 14, opacity: 0, duration: 0.9 }, 0.7)
            .from("[data-ct-rule]", { scaleX: 0, duration: 1.4 }, 0.75)
            .from("[data-ct-mark]", { scale: 0.6, opacity: 0, duration: 1 }, 0.85)
            .from("[data-ct-cta]", { y: 18, opacity: 0, duration: 0.9 }, 1.05);
        }),
      );
    }, el);

    ScrollTrigger.refresh();
    return () => {
      stopIntro?.();
      ctx.revert();
    };
  }, []);

  return (
    /* Centred and breadcrumbed, matching About, Our Services and Our Projects —
       the interior pages have to open the same way or the site reads as four
       sites. */
    <section
      ref={root}
      aria-labelledby="contact-hero-heading"
      className="relative isolate flex min-h-[86svh] flex-col justify-center overflow-hidden pt-36 pb-24 sm:pt-40 sm:pb-28"
    >
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div ref={plate} className="absolute inset-x-0 -inset-y-[10%]">
          <div ref={frame} className="absolute inset-0 will-change-transform">
            <Image
              src={contactHero.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
        </div>

        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--bg) 1%, rgb(8 8 8 / 0.70) 15%, rgb(8 8 8 / 0.16) 42%, transparent 64%)",
            }}
          />
          <div data-ct-hero-scrim-fade className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(82% 66% at 50% 48%, rgb(8 8 8 / 0.70) 0%, rgb(8 8 8 / 0.54) 45%, rgb(8 8 8 / 0.18) 78%, transparent 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgb(8 8 8 / 0.62), transparent 15%)",
              }}
            />
            {/* Flat ellipse across the title row. The plate is a lit city grid,
                so its brightest pixels land exactly where the gold H1 does; the
                correction is local rather than a deeper global wash, which would
                flatten the whole photograph into a silhouette. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(75% 26% at 50% 34%, rgb(8 8 8 / 0.58) 0%, rgb(8 8 8 / 0.46) 55%, rgb(8 8 8 / 0.16) 82%, transparent 100%)",
              }}
            />
          </div>
        </div>
        <div className="grain absolute inset-0" />
      </div>

      <div
        data-ct-hero-exit
        className="container-page relative z-10 flex flex-col items-center text-center"
      >
        <h1
          id="contact-hero-heading"
          className="block overflow-hidden pb-[0.08em] display-hero font-display"
          style={{ color: "var(--accent)" }}
        >
          <span data-ct-hero data-ct-title className="block">
            {contactHero.heading}
          </span>
        </h1>

        <nav data-ct-hero data-ct-crumb aria-label="Breadcrumb" className="mt-6">
          <ol className="flex flex-wrap items-center justify-center gap-2 font-mono text-[0.6875rem] font-semibold tracking-[0.24em] text-white/60 uppercase">
            {contactHero.breadcrumb.map((crumb, index) => {
              const last = index === contactHero.breadcrumb.length - 1;
              return (
                <li key={crumb.href} className="flex items-center gap-2">
                  {index > 0 ? (
                    <ChevronRight aria-hidden className="size-3 text-white/30" />
                  ) : null}
                  {last ? (
                    <span aria-current="page" style={{ color: "var(--accent)" }}>
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="transition-colors duration-300 hover:text-[var(--accent)]"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <span
          data-ct-hero
          data-ct-rule
          aria-hidden
          className="mt-9 block h-px w-full max-w-xs"
          style={{
            background: "linear-gradient(to right, transparent, var(--accent) 50%, transparent)",
          }}
        />

        <span
          data-ct-hero
          data-ct-mark
          aria-hidden
          className="mt-9 flex size-16 items-center justify-center rounded-full border backdrop-blur-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
            color: "var(--accent)",
            backgroundColor: "rgb(8 8 8 / 0.35)",
          }}
        >
          <MessagesSquare className="size-7" strokeWidth={1.4} />
        </span>

        <div data-ct-hero data-ct-cta className="mt-10">
          <Link
            href={contactHero.cta.href}
            className="group inline-flex min-h-11 items-center gap-3 rounded-full border px-6 py-3 font-mono text-[0.6875rem] font-semibold tracking-[0.22em] text-white/90 uppercase backdrop-blur-md transition-all duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)]"
            style={{
              borderColor: "rgb(255 255 255 / 0.18)",
              backgroundColor: "rgb(8 8 8 / 0.72)",
            }}
          >
            {contactHero.cta.label}
            <ChevronRight
              aria-hidden
              className="size-3.5 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
