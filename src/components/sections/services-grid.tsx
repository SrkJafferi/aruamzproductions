"use client";

import Image from "next/image";
import { useEffect, useRef, type MouseEvent } from "react";
import { Camera, Clapperboard, Film, Lightbulb, Megaphone, Warehouse } from "lucide-react";
import { services } from "@/content/services";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";

/**
 * One icon per service, keyed by slug rather than by index so reordering the
 * content array can never silently hand a service the wrong mark.
 */
const ICONS = {
  "corporate-documentary": Film,
  photography: Camera,
  "studio-for-rent": Warehouse,
  "creative-strategy": Lightbulb,
  "video-production": Clapperboard,
  "digital-advertising": Megaphone,
} as const;

export function ServicesGrid() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const settle = () =>
      el.querySelectorAll(".reveal").forEach((node) => node.classList.add("reveal-done"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle();
      return;
    }

    const gsap = registerGsap();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-svc-head] .reveal",
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
        },
      );

      /* The cards get their own trigger on the grid rather than on the section:
         with six of them the second row is a screen further down, and one
         section-level stagger would have already played it off-screen. */
      gsap.fromTo(
        "[data-svc-card]",
        { opacity: 0, y: 44 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-svc-grid]", start: "top 84%", once: true },
          onComplete: settle,
        },
      );

      /* Each still drifts inside its own frame as the card crosses the viewport.
         Small on purpose — the frame crops 6% of the image, so a 6% travel never
         exposes an edge, and anything larger reads as a slideshow. */
      gsap.utils.toArray<HTMLElement>("[data-svc-still]").forEach((still) => {
        gsap.fromTo(
          still,
          { yPercent: -3 },
          {
            yPercent: 3,
            ease: "none",
            scrollTrigger: {
              trigger: still.closest("[data-svc-card]"),
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  /* The gold bloom under the pointer. Written as custom properties so the paint
     stays in CSS and React never re-renders on mouse move. */
  const track = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  return (
    <section
      ref={root}
      aria-labelledby="services-grid-heading"
      className="relative py-20 sm:py-28 lg:py-32"
      style={{ backgroundColor: "var(--bg-elevated)" }}
    >
      {/* A single hairline across the top of the band, fading out at both ends —
          the join out of the hero, so the grid starts on a drawn line rather
          than on a change of colour alone. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 block h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 55%, transparent) 50%, transparent)",
        }}
      />

      <div className="container-page">
        <header data-svc-head className="max-w-3xl">
          <p className="reveal eyebrow">{services.eyebrow}</p>

          <h2 id="services-grid-heading" className="reveal mt-5 display-lg font-display">
            {services.heading}
          </h2>

          <span
            aria-hidden
            className="reveal mt-7 block h-px w-24"
            style={{ backgroundColor: "var(--accent)" }}
          />
        </header>

        <div
          data-svc-grid
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-6"
        >
          {services.items.map((item, index) => {
            const Icon = ICONS[item.slug];
            return (
              <article
                key={item.slug}
                id={`service-${item.slug}`}
                data-svc-card
                onMouseMove={track}
                /* `scroll-mt` clears the fixed navbar when the hero's index
                   jumps down to a card. */
                className="group relative flex scroll-mt-28 flex-col overflow-hidden rounded-3xl transition-[transform,border-color,box-shadow] duration-700 ease-[var(--ease-out-quint)] hover:-translate-y-1.5"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--hairline)",
                }}
              >
                {/* Bloom, tracking the pointer. Falls back to the card's centre
                    before the first move, and never shows on touch because the
                    opacity is tied to hover. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(16rem 16rem at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)",
                  }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  style={{
                    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent)",
                  }}
                />

                <div
                  className="relative aspect-4/3 overflow-hidden"
                  style={{ backgroundColor: "var(--bg-elevated-2)" }}
                >
                  {/* The still is oversized and centred so both the scroll drift
                      and the hover zoom have somewhere to go. */}
                  <div data-svc-still className="absolute -inset-y-[6%] inset-x-0">
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                      className="object-cover object-center transition-transform duration-[1400ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.08]"
                    />
                  </div>

                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, var(--bg) 2%, rgb(8 8 8 / 0.55) 32%, rgb(8 8 8 / 0.10) 70%, transparent 100%)",
                    }}
                  />

                  {/* Index, set on the still rather than behind the copy — the
                      About cards use the ghosted numeral, so this page takes the
                      other treatment and the two pages do not repeat. */}
                  <span
                    aria-hidden
                    className="absolute top-5 right-5 z-10 font-mono text-[0.6875rem] font-semibold tracking-[0.22em] transition-colors duration-500"
                    style={{ color: "rgb(255 255 255 / 0.55)" }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* Icon badge, positioned comfortably inside the bottom of the still frame */}
                  <span
                    aria-hidden
                    className="absolute bottom-5 left-7 z-10 flex size-14 items-center justify-center rounded-full border backdrop-blur-md transition-[border-color,background-color,scale] duration-700 ease-[var(--ease-out-quint)] group-hover:scale-110 group-hover:border-[var(--accent)]"
                    style={{
                      borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)",
                      color: "var(--accent)",
                      backgroundColor: "rgb(8 8 8 / 0.72)",
                    }}
                  >
                    <Icon className="size-6" strokeWidth={1.4} />
                  </span>
                </div>

                <div className="relative z-10 flex flex-1 flex-col px-7 pt-7 pb-9 sm:px-8 sm:pb-10">
                  {/* Uniform case in CSS: the legacy source sets three of the six
                      headings in capitals and three in title case, which is an
                      accident of the old editor rather than a distinction. The
                      strings themselves are stored exactly as written. */}
                  <h3 className="font-display text-[1.375rem] leading-[1.2] tracking-[0.015em] uppercase sm:text-2xl">
                    {item.heading}
                  </h3>

                  <span
                    aria-hidden
                    className="mt-5 block h-px w-14 transition-[width] duration-700 ease-[var(--ease-out-quint)] group-hover:w-24"
                    style={{ backgroundColor: "var(--accent)" }}
                  />

                  <p
                    className="mt-6 text-[0.9375rem] leading-[1.85]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {item.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
