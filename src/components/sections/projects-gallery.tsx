"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Maximize2 } from "lucide-react";
import { projectsGallery } from "@/content/projects";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { Lightbox, useLightbox } from "@/components/sections/lightbox";

export function ProjectsGallery() {
  const root = useRef<HTMLElement>(null);
  const lightbox = useLightbox();
  const images = projectsGallery.images;

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const settle = () => {
      el.querySelectorAll(".reveal").forEach((node) => node.classList.add("reveal-done"));
      el.querySelectorAll("[data-prj-tile]").forEach((node) => node.classList.add("reveal-done"));
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle();
      return;
    }

    const gsap = registerGsap();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-prj-head] .reveal",
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

      /* One trigger per tile rather than one staggered timeline for the set:
         the masonry is four screens tall, so a single stagger would play most
         of it off-screen. Each still lifts as it crosses into view instead. */
      gsap.utils.toArray<HTMLElement>("[data-prj-tile]").forEach((tile) => {
        gsap.fromTo(
          tile,
          { opacity: 0, y: 44, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: tile, start: "top 92%", once: true },
            onComplete: () => tile.classList.add("reveal-done"),
          },
        );
      });
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      id="projects-gallery"
      aria-labelledby="projects-gallery-heading"
      className="relative scroll-mt-24 py-20 sm:py-28 lg:py-32"
      style={{ backgroundColor: "var(--bg-elevated)" }}
    >
      {/* The join out of the hero, drawn as a line rather than left to a change
          of colour alone — the same seam the Services grid uses. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 block h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 55%, transparent) 50%, transparent)",
        }}
      />

      <div className="container-page">
        <header
          data-prj-head
          className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-3xl">
            <p className="reveal eyebrow">{projectsGallery.eyebrow}</p>

            <h2 id="projects-gallery-heading" className="reveal mt-5 display-lg font-display">
              {projectsGallery.heading}
            </h2>

            <span
              aria-hidden
              className="reveal mt-7 block h-px w-24"
              style={{ backgroundColor: "var(--accent)" }}
            />
          </div>

          {/* Counted, not written — see the note in the content file. */}
          <p className="reveal font-mono text-[0.6875rem] font-semibold tracking-[0.24em] uppercase sm:pb-2 sm:text-right">
            <span className="font-display text-3xl tracking-normal" style={{ color: "var(--accent)" }}>
              {images.length}
            </span>
            <span className="ml-3" style={{ color: "var(--fg-muted)" }}>
              images
            </span>
          </p>
        </header>

        {/* CSS columns give a true masonry flow without measuring heights in JS,
            so the grid stays stable while 48 stills stream in. Same mechanism as
            the homepage gallery, at a tighter gutter to match the legacy page's
            own "tiny space" setting. */}
        <div className="mt-14 gap-3 [column-count:1] sm:[column-count:2] lg:mt-16 lg:gap-4 xl:[column-count:3]">
          {images.map((item, position) => (
            <button
              key={item.src}
              type="button"
              data-prj-tile
              onClick={() => lightbox.open(position)}
              aria-label={`Open project image ${position + 1} of ${images.length}`}
              className="group relative mb-3 block w-full overflow-hidden rounded-xl lg:mb-4"
              style={{ backgroundColor: "var(--bg-elevated-2)" }}
            >
              <Image
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 30vw"
                className="h-auto w-full transition-transform duration-[1100ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.06]"
              />

              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(to top, rgb(8 8 8 / 0.82), rgb(8 8 8 / 0.12) 55%, transparent)",
                }}
              />

              {/* Gold ring, inset so it reads as a frame drawn on the still
                  rather than as a border that shifts the tile's box. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                style={{
                  boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--accent) 60%, transparent)",
                }}
              />

              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-4 bottom-4 flex translate-y-2 items-center justify-between opacity-0 transition-all duration-500 ease-[var(--ease-out-quint)] group-hover:translate-y-0 group-hover:opacity-100"
              >
                <span className="font-mono text-[0.6875rem] font-semibold tracking-[0.24em] text-white/85">
                  {String(position + 1).padStart(2, "0")}
                </span>
                <span
                  className="flex size-9 items-center justify-center rounded-full border border-white/25 backdrop-blur-sm"
                  style={{ color: "var(--accent)", backgroundColor: "rgb(8 8 8 / 0.55)" }}
                >
                  <Maximize2 className="size-4" strokeWidth={1.6} />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {lightbox.index !== null ? (
        <Lightbox
          items={images}
          index={lightbox.index}
          onClose={lightbox.close}
          onNavigate={lightbox.navigate}
        />
      ) : null}
    </section>
  );
}
