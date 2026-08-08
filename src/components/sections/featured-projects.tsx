"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { featured } from "@/content/homepage";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { Lightbox, useLightbox } from "@/components/sections/lightbox";

/** How many stills show before the visitor asks for the rest. */
const INITIAL = 12;

export function FeaturedProjects() {
  const root = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const lightbox = useLightbox();

  const visible = expanded ? featured.images : featured.images.slice(0, INITIAL);
  const remaining = featured.images.length - INITIAL;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.querySelectorAll("[data-tile]").forEach((tile) => tile.classList.add("reveal-done"));
      return;
    }

    const gsap = registerGsap();
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-tile]:not(.reveal-done)").forEach((tile) => {
        gsap.fromTo(
          tile,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.95,
            ease: "power3.out",
            scrollTrigger: { trigger: tile, start: "top 92%", once: true },
            onComplete: () => tile.classList.add("reveal-done"),
          },
        );
      });
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [expanded]);

  return (
    <section
      ref={root}
      id="projects"
      aria-labelledby="projects-heading"
      className="relative py-20 sm:py-28 lg:py-32"
      style={{ backgroundColor: "var(--bg-elevated)" }}
    >
      <div className="container-page">
        <header className="max-w-3xl">
          <p className="eyebrow">{featured.eyebrow}</p>
          <h2 id="projects-heading" className="mt-5 display-lg font-display">
            {featured.heading}
          </h2>
          <div
            aria-hidden
            className="mt-7 h-px w-24"
            style={{ backgroundColor: "var(--accent)" }}
          />
        </header>

        {/*
          CSS columns give a true masonry flow without measuring heights in JS,
          so the grid stays stable while images stream in.
        */}
        <div className="mt-14 gap-4 [column-count:1] sm:[column-count:2] lg:gap-5 xl:[column-count:3]">
          {visible.map((item, position) => (
            <button
              key={item.src}
              type="button"
              data-tile
              onClick={() => lightbox.open(position)}
              aria-label={`Open project image ${position + 1} of ${featured.images.length}`}
              className="reveal group relative mb-4 block w-full overflow-hidden rounded-xl lg:mb-5"
              style={{ backgroundColor: "var(--bg-elevated-2)" }}
            >
              <Image
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 30vw"
                className="h-auto w-full transition-transform duration-[900ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
              />

              <span
                aria-hidden
                className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(to top, rgb(8 8 8 / 0.72), rgb(8 8 8 / 0.1) 55%, transparent)",
                }}
              />

              <span
                aria-hidden
                className="absolute inset-x-4 bottom-4 flex items-center justify-between opacity-0 transition-all duration-500 group-hover:opacity-100"
              >
                <span className="font-mono text-[0.6875rem] tracking-[0.24em] text-white/70">
                  {String(position + 1).padStart(2, "0")}
                </span>
                <span
                  className="flex size-9 items-center justify-center rounded-full border border-white/25 backdrop-blur-sm"
                  style={{ color: "var(--accent)" }}
                >
                  <Plus className="size-4" />
                </span>
              </span>
            </button>
          ))}
        </div>

        {!expanded && remaining > 0 ? (
          <div className="mt-10 flex justify-center">
            <button type="button" onClick={() => setExpanded(true)} className="btn-ghost">
              Show {remaining} more
            </button>
          </div>
        ) : null}
      </div>

      {lightbox.index !== null ? (
        <Lightbox
          items={featured.images}
          index={lightbox.index}
          onClose={lightbox.close}
          onNavigate={lightbox.navigate}
        />
      ) : null}
    </section>
  );
}
