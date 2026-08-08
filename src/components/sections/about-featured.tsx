"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { aboutFeatured } from "@/content/about";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { Lightbox, useLightbox } from "@/components/sections/lightbox";

/**
 * The About page's own three-still set — not the homepage's thirty-two. Three
 * tiles are too few for the masonry column flow used there (it would leave a
 * ragged single row), so they are set as one editorial block: a tall frame
 * against a stacked pair.
 */
export function AboutFeatured() {
  const root = useRef<HTMLElement>(null);
  const lightbox = useLightbox();

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.querySelectorAll(".reveal").forEach((node) => node.classList.add("reveal-done"));
      return;
    }

    const gsap = registerGsap();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".reveal",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
          onComplete: () =>
            el.querySelectorAll(".reveal").forEach((node) => node.classList.add("reveal-done")),
        },
      );

      /* Each tile gets its own trigger as well, so a still that is still below
         the fold when the header animates does not arrive already settled. */
      gsap.utils.toArray<HTMLElement>("[data-about-tile]").forEach((tile) => {
        gsap.fromTo(
          tile,
          { opacity: 0, y: 44 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: tile, start: "top 90%", once: true },
          },
        );
      });
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  /* Tile 1 stands full height against the stacked pair; on anything below lg
     they simply run down the page at a common aspect. */
  const placement = [
    "lg:col-span-7 lg:row-span-2",
    "lg:col-span-5",
    "lg:col-span-5",
  ];

  return (
    <section
      ref={root}
      id="about-featured"
      aria-labelledby="about-featured-heading"
      className="relative py-20 sm:py-28 lg:py-32"
    >
      <div className="container-page">
        <header>
          <h2
            id="about-featured-heading"
            className="reveal max-w-3xl display-lg font-display"
          >
            {aboutFeatured.heading}
          </h2>

          <span
            aria-hidden
            className="reveal mt-7 block h-px w-24"
            style={{ backgroundColor: "var(--accent)" }}
          />

          {/* One line in the source, separated by en-dashes. Set as a list so
              the four disciplines read as four rather than as one long run —
              the wording and the order are untouched. Deliberately not held to
              the heading's measure: at 3xl the fourth chip wraps alone onto a
              second row with half the band empty beside it. */}
          <ul className="reveal mt-8 flex flex-wrap gap-2.5">
            {aboutFeatured.disciplines.map((discipline) => (
              <li
                key={discipline}
                className="rounded-full px-4 py-2 font-mono text-[0.6875rem] font-semibold tracking-[0.2em] uppercase transition-colors duration-500"
                style={{
                  border: "1px solid var(--hairline-strong)",
                  color: "var(--accent)",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                {discipline}
              </li>
            ))}
          </ul>
        </header>

        <div className="mt-14 grid gap-4 lg:h-[38rem] lg:grid-cols-12 lg:grid-rows-2 lg:gap-5">
          {aboutFeatured.images.map((item, position) => (
            <button
              key={item.src}
              type="button"
              data-about-tile
              onClick={() => lightbox.open(position)}
              aria-label={`Open featured image ${position + 1} of ${aboutFeatured.images.length}`}
              className={`group relative block w-full overflow-hidden rounded-2xl ${placement[position] ?? ""}`}
              style={{ backgroundColor: "var(--bg-elevated-2)" }}
            >
              <span className="relative block aspect-4/3 w-full lg:h-full lg:aspect-auto">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 1024px) 92vw, (max-width: 1280px) 46vw, 40vw"
                  className="object-cover object-center transition-transform duration-[1100ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.06]"
                />
              </span>

              <span
                aria-hidden
                className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(to top, rgb(8 8 8 / 0.76), rgb(8 8 8 / 0.12) 55%, transparent)",
                }}
              />

              <span
                aria-hidden
                className="absolute inset-0 rounded-2xl transition-shadow duration-500"
                style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}
              />

              <span
                aria-hidden
                className="absolute inset-x-5 bottom-5 flex translate-y-2 items-center justify-between opacity-0 transition-all duration-500 ease-[var(--ease-out-quint)] group-hover:translate-y-0 group-hover:opacity-100"
              >
                <span className="font-mono text-[0.6875rem] tracking-[0.24em] text-white/70">
                  {String(position + 1).padStart(2, "0")} /{" "}
                  {String(aboutFeatured.images.length).padStart(2, "0")}
                </span>
                <span
                  className="flex size-10 items-center justify-center rounded-full border border-white/25 backdrop-blur-sm"
                  style={{ color: "var(--accent)" }}
                >
                  <Plus className="size-4" />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {lightbox.index !== null ? (
        <Lightbox
          items={aboutFeatured.images}
          index={lightbox.index}
          onClose={lightbox.close}
          onNavigate={lightbox.navigate}
        />
      ) : null}
    </section>
  );
}
