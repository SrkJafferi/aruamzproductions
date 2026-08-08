"use client";

import Image from "next/image";
import { Quote } from "lucide-react";
import { aboutWhoWeAre } from "@/content/about";
import { useReveal } from "@/hooks/use-reveal";

export function AboutWhoWeAre() {
  const scope = useReveal<HTMLElement>({ start: "top 80%" });

  return (
    <section
      ref={scope}
      aria-labelledby="about-who-heading"
      className="relative py-20 sm:py-28 lg:py-32"
      style={{ backgroundColor: "var(--bg-elevated)" }}
    >
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-20">
          {/* Framed still rather than a full-bleed plate: the band above and the
              band below both run edge to edge, and three plates in a row stop
              reading as separate sections. */}
          <div className="reveal group relative">
            <div
              className="relative aspect-4/5 overflow-hidden rounded-3xl sm:aspect-3/4 lg:aspect-4/5"
              style={{ backgroundColor: "var(--bg-elevated-2)" }}
            >
              <Image
                src={aboutWhoWeAre.image}
                alt=""
                fill
                sizes="(max-width: 1024px) 92vw, 42vw"
                className="object-cover object-center transition-transform duration-[1200ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.06]"
              />
              <span
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgb(8 8 8 / 0.55), transparent 45%)",
                }}
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-3xl"
                style={{ boxShadow: "inset 0 0 0 1px var(--hairline-strong)" }}
              />
            </div>

            {/* Corner bracket, offset off the frame — the reference design's one
                structural flourish on this block. Kept short so it reads as a
                corner rather than as a stray rule running down the gutter, and
                dropped on small screens where it would crowd the image. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-4 -bottom-4 hidden size-24 rounded-br-3xl border-r-2 border-b-2 sm:block"
              style={{ borderColor: "color-mix(in srgb, var(--accent) 60%, transparent)" }}
            />
          </div>

          <div className="max-w-2xl">
            <p className="reveal eyebrow">{aboutWhoWeAre.eyebrow}</p>

            <h2 id="about-who-heading" className="reveal mt-5 display-lg font-display">
              {aboutWhoWeAre.heading}
            </h2>

            <span
              aria-hidden
              className="reveal mt-7 block h-px w-24"
              style={{ backgroundColor: "var(--accent)" }}
            />

            <p
              className="reveal mt-8 text-base leading-[1.85] sm:text-lg"
              style={{ color: "var(--fg-muted)" }}
            >
              {aboutWhoWeAre.body}
            </p>

            <figure
              className="reveal relative mt-10 overflow-hidden rounded-2xl p-8 sm:p-10"
              style={{
                backgroundColor: "var(--bg-elevated-2)",
                border: "1px solid var(--hairline)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 block w-0.5"
                style={{ background: "linear-gradient(to bottom, var(--accent), transparent)" }}
              />
              <Quote
                aria-hidden
                className="size-7 opacity-70"
                strokeWidth={1.4}
                style={{ color: "var(--accent)" }}
              />
              <blockquote className="mt-5">
                <p
                  className="font-sans text-xl leading-[1.55] font-light italic sm:text-2xl"
                  style={{ color: "var(--accent)" }}
                >
                  {aboutWhoWeAre.quote}
                </p>
              </blockquote>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
