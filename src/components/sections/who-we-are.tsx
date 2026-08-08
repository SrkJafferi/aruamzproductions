"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Flag } from "lucide-react";
import { mission, whoWeAre } from "@/content/homepage";
import { registerGsap } from "@/lib/gsap";

export function WhoWeAre() {
  const root = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);

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
          duration: 0.95,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 78%", once: true },
          onComplete: () =>
            el.querySelectorAll(".reveal").forEach((node) => node.classList.add("reveal-done")),
        },
      );

      gsap.to(media.current, {
        yPercent: -9,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      aria-labelledby="who-heading"
      className="relative overflow-hidden py-20 sm:py-28 lg:py-32"
    >
      {/* Full-bleed still from the legacy page, dimmed to carry text. */}
      <div ref={media} className="absolute inset-0 -top-[6%] h-[112%]">
        <Image
          src={whoWeAre.image}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            /* Was 0.94 → 0.6 across, which suited a single left-hand column.
               The band now carries copy on both sides, so the falloff is much
               flatter — the right edge no longer brightens under the card. */
            "linear-gradient(to right, rgb(8 8 8 / 0.94) 0%, rgb(8 8 8 / 0.88) 48%, rgb(8 8 8 / 0.76) 100%)",
        }}
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="container-page relative z-10">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-20">
          <div className="max-w-2xl">
            <p className="reveal eyebrow">Our practice</p>

            <h2 id="who-heading" className="reveal mt-5 display-lg font-display text-white">
              {whoWeAre.heading}
            </h2>

            <p className="reveal mt-8 text-base leading-[1.8] text-white/70 sm:text-lg">
              {whoWeAre.body}
            </p>

            <blockquote
              className="reveal mt-10 border-l-2 pl-6 sm:pl-8"
              style={{ borderColor: "var(--accent)" }}
            >
              <p
                className="font-sans text-xl leading-[1.5] font-light italic sm:text-2xl"
                style={{ color: "var(--accent)" }}
              >
                {whoWeAre.quote}
              </p>
            </blockquote>
          </div>

          {/* The mission, lifted out of the card grid that used to sit below and
              set opposite the practice statement instead — the two answer each
              other, so they read better side by side than stacked.
              An article with its own accessible name rather than a section, so
              it stays self-contained and does not present as a sub-topic of
              "who we are" just because it shares the band. */}
          <article
            aria-labelledby="mission-heading"
            className="reveal relative overflow-hidden rounded-3xl p-8 sm:p-10 lg:p-12"
            style={{
              /* Translucent, not solid: the still behind carries through the
                 card, which is what keeps this from looking like a box dropped
                 on a photo. */
              backgroundColor: "rgb(8 8 8 / 0.55)",
              backdropFilter: "blur(14px)",
              border: "1px solid var(--hairline-strong)",
            }}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 block h-px"
              style={{ background: "linear-gradient(to right, var(--accent), transparent 70%)" }}
            />

            <span
              aria-hidden
              className="flex size-12 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--hairline-strong)", color: "var(--accent)" }}
            >
              <Flag className="size-5" />
            </span>

            <h3 id="mission-heading" className="mt-7 display-md font-display text-white">
              {mission.heading}
            </h3>

            <span
              aria-hidden
              className="mt-5 block h-px w-16"
              style={{ backgroundColor: "var(--accent)" }}
            />

            <p className="mt-6 text-base leading-[1.8] text-white/70">{mission.body}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
