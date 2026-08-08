"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronRight, Clapperboard } from "lucide-react";
import { services, servicesHero } from "@/content/services";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { onAppReady } from "@/lib/app-ready";

export function ServicesHero() {
  const root = useRef<HTMLElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.querySelectorAll<HTMLElement>("[data-svc-hero]").forEach((node) => {
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
         section — the same defect already fixed on the home and About heroes. */
      gsap.to("[data-svc-hero-exit]", {
        opacity: 0,
        y: -34,
        ease: "none",
        scrollTrigger: { trigger: el, start: "45% top", end: "bottom top", scrub: true },
      });
      gsap.to("[data-svc-hero-scrim-fade]", {
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "45% top", end: "bottom top", scrub: true },
      });

      stopIntro = onAppReady(() =>
        ctx.add(() => {
          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

          tl.from(frame.current, { scale: 1.14, duration: 2, ease: "power3.out" })
            .from("[data-svc-title]", { yPercent: 116, duration: 1.4, ease: "expo.out" }, 0.2)
            .from("[data-svc-crumb]", { y: 14, opacity: 0, duration: 0.9 }, 0.7)
            .from("[data-svc-rule]", { scaleX: 0, duration: 1.4 }, 0.75)
            .from("[data-svc-mark]", { scale: 0.6, opacity: 0, duration: 1 }, 0.85)
            /* The index is the page's own table of contents, so it arrives last
               and item by item — it reads as a list being set, not as a block
               of chrome fading up. */
            .from(
              "[data-svc-index-item]",
              { y: 18, opacity: 0, duration: 0.8, stagger: 0.07 },
              1,
            );
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
    /* Centred and breadcrumbed, matching the About hero — the two interior
       pages have to open the same way or the site reads as two sites. */
    <section
      ref={root}
      aria-labelledby="services-hero-heading"
      className="relative isolate flex min-h-[86svh] flex-col justify-center overflow-hidden pt-36 pb-24 sm:pt-40 sm:pb-28"
    >
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div ref={plate} className="absolute inset-x-0 -inset-y-[10%]">
          <div ref={frame} className="absolute inset-0 will-change-transform">
            <Image
              src={servicesHero.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
              style={{ filter: "brightness(1.08) contrast(1.05)" }}
            />
          </div>
        </div>

        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--bg) 1%, rgb(8 8 8 / 0.68) 15%, rgb(8 8 8 / 0.14) 42%, transparent 64%)",
            }}
          />
          <div data-svc-hero-scrim-fade className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(80% 64% at 50% 50%, rgb(8 8 8 / 0.70) 0%, rgb(8 8 8 / 0.56) 45%, rgb(8 8 8 / 0.18) 78%, transparent 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgb(8 8 8 / 0.62), transparent 15%)",
              }}
            />
            {/* A second, flatter ellipse pinned to the title row. The frame has a
                blown-out softbox sitting exactly where "Services" lands, and the
                gold reads at 2:1 against it. Deepening the main radial enough to
                fix that flattened the whole photograph into a silhouette, so the
                correction is local: wide and soft, dark only across the band the
                type actually occupies. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(75% 26% at 50% 30%, rgb(8 8 8 / 0.58) 0%, rgb(8 8 8 / 0.46) 55%, rgb(8 8 8 / 0.16) 82%, transparent 100%)",
              }}
            />
          </div>
        </div>
        <div className="grain absolute inset-0" />
      </div>

      <div
        data-svc-hero-exit
        className="container-page relative z-10 flex flex-col items-center text-center"
      >
        <h1
          id="services-hero-heading"
          className="block overflow-hidden pb-[0.08em] display-hero font-display"
          style={{ color: "var(--accent)" }}
        >
          <span data-svc-hero data-svc-title className="block">
            {servicesHero.heading}
          </span>
        </h1>

        <nav data-svc-hero data-svc-crumb aria-label="Breadcrumb" className="mt-6">
          <ol className="flex flex-wrap items-center justify-center gap-2 font-mono text-[0.6875rem] font-semibold tracking-[0.24em] text-white/60 uppercase">
            {servicesHero.breadcrumb.map((crumb, index) => {
              const last = index === servicesHero.breadcrumb.length - 1;
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
          data-svc-hero
          data-svc-rule
          aria-hidden
          className="mt-9 block h-px w-full max-w-xs"
          style={{
            background: "linear-gradient(to right, transparent, var(--accent) 50%, transparent)",
          }}
        />

        <span
          data-svc-hero
          data-svc-mark
          aria-hidden
          className="mt-9 flex size-16 items-center justify-center rounded-full border backdrop-blur-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
            color: "var(--accent)",
            backgroundColor: "rgb(8 8 8 / 0.35)",
          }}
        >
          <Clapperboard className="size-7" strokeWidth={1.4} />
        </span>

        {/* The six service names, set as the page's index. Not new copy — every
            label is a heading from the grid below, read straight out of the same
            array, so the two can never drift. Each one jumps to its own card. */}
        <nav aria-label="Services on this page" className="mt-10 w-full max-w-4xl">
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2.5 sm:gap-x-3">
            {services.items.map((item) => (
              <li key={item.slug} data-svc-hero data-svc-index-item>
                <Link
                  href={`#service-${item.slug}`}
                  /* The chips sit low in the frame, over a lit studio floor, so
                     they carry their own plate rather than relying on the scrim
                     — at 11px they need 4.5:1 and a 0.32 wash does not give it. */
                  className="inline-flex items-center rounded-full border px-4 py-2 font-mono text-[0.625rem] font-semibold tracking-[0.18em] text-white/90 uppercase backdrop-blur-md transition-all duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[rgb(8_8_8/0.82)] hover:text-[var(--accent)] sm:text-[0.6875rem]"
                  style={{
                    borderColor: "rgb(255 255 255 / 0.18)",
                    backgroundColor: "rgb(8 8 8 / 0.72)",
                  }}
                >
                  {item.heading}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
