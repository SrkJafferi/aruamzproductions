"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { CalendarDays, Clapperboard, Handshake, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { facts } from "@/content/homepage";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { useReveal } from "@/hooks/use-reveal";

/** Keyed by the label already in the content, so no new copy is introduced. */
const ICONS: Record<string, LucideIcon> = {
  Established: CalendarDays,
  Employees: Users,
  Clients: Handshake,
  Projects: Clapperboard,
};

export function CompanyFacts() {
  const scope = useReveal<HTMLElement>({ stagger: 0.1 });
  const grid = useRef<HTMLDListElement>(null);

  useEffect(() => {
    const root = grid.current;
    if (!root) return;

    /* The finished number is what the server renders, so it is already correct
       for a no-JS visitor and for anyone who asked for less motion — both paths
       simply leave it alone. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-fact]"));
    const gsap = registerGsap();

    // Zeroed on mount rather than when the trigger fires: the section is far
    // below the fold, so this happens long before it is ever looked at. Doing it
    // inside the tween would show the real figure and then snap back to nought.
    for (const card of cards) {
      const digit = card.querySelector<HTMLElement>("[data-count]");
      if (digit) digit.textContent = "0";
    }

    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        /* Walked from the card down rather than from the digit up, so the year —
           which has no digit to count — still gets its rule drawn. Otherwise one
           card would sit inert beside three that move. */
        const digit = card.querySelector<HTMLElement>("[data-count]");
        const bar = card.querySelector<HTMLElement>("[data-fact-bar]");

        const tl = gsap.timeline({
          delay: i * 0.12,
          scrollTrigger: { trigger: root, start: "top 82%", once: true },
        });

        if (digit) {
          const target = Number(digit.dataset.count);
          const counter = { value: 0 };
          tl.to(
            counter,
            {
              value: target,
              duration: 1.9,
              /* power1, where the rest of the page uses power2/power3. Those are
                 right for motion and wrong for a quantity: power3.out clears 94%
                 of its distance in the first half of its run, which measured as
                 half the count landing in 429ms of 1900ms. The eye reads that as
                 the number appearing and then twitching, not as counting. power1
                 spreads the distance closer to evenly, so the digits are legibly
                 in motion for most of the duration. */
              ease: "power1.out",
              /* Rounded on read, not stored rounded: the tween keeps sub-integer
                 precision so the long tail of the ease still ticks over instead
                 of sitting on the final digit for the last half second. */
              onUpdate: () => {
                digit.textContent = String(Math.round(counter.value));
              },
            },
            0,
          );
        }

        if (bar) {
          // The rule is motion, not a quantity, so it keeps the house ease.
          tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1.9, ease: "power3.out" }, 0);
        }
      });
    }, root);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={scope}
      aria-labelledby="facts-heading"
      className="relative overflow-hidden py-20 sm:py-28 lg:py-32"
      /* Same trick as the founder's band: clip-path clips the subtree without
         becoming a containing block for fixed descendants, so the plate below
         stays locked to the viewport while this section travels past it.
         overflow-hidden is kept for everything else — it does not clip a fixed
         child at all. */
      style={{ backgroundColor: "var(--bg-elevated)", clipPath: "inset(0)" }}
    >
      <FactsBackdrop />

      <div className="container-page relative z-10">
        <header className="reveal max-w-2xl">
          <h2 id="facts-heading" className="display-lg font-display">
            {facts.heading}
          </h2>
          <p className="mt-5 text-base leading-relaxed" style={{ color: "var(--fg-muted)" }}>
            {facts.sub}
          </p>
        </header>

        <dl ref={grid} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {facts.items.map((item) => {
            const Icon = ICONS[item.label];
            const isPlain = "plain" in item && item.plain;

            return (
              <div
                key={item.label}
                data-fact
                /* Translucent, not the solid --bg it started as. With opaque
                   cards the plate behind would only survive in the gutters, and
                   a photograph with four rectangles punched out of it reads as a
                   mistake. At 62% the fill still carries the numbers.
                   hairline-strong, not hairline: --bg on --bg-elevated is a
                   1.07:1 step, so at 8% the edge measured 1.10:1 against the band
                   and the cards did not read as cards at all. */
                className="reveal group relative overflow-hidden rounded-2xl border border-[var(--hairline-strong)] bg-[color-mix(in_srgb,var(--bg)_62%,transparent)] p-7 backdrop-blur-md transition-colors duration-500 hover:border-[var(--accent)] sm:p-8"
              >
                {/* Tinted inside the gradient rather than by fading a solid
                    accent in: a full-strength wash at opacity-100 would flood
                    the card, and the alpha has to survive the theme swap. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, var(--accent) 16%, transparent) 0%, transparent 70%)",
                  }}
                />

                {/* Border colours live in classes, not inline styles: an inline
                    borderColor outranks every hover variant, so the card and the
                    icon ring would both sit frozen on their resting colour. */}
                <span
                  aria-hidden
                  className="relative flex size-11 items-center justify-center rounded-full border border-[var(--hairline-strong)] text-[var(--accent)] transition-colors duration-500 group-hover:border-[var(--accent)]"
                >
                  {Icon ? <Icon className="size-[1.15rem]" strokeWidth={1.5} /> : null}
                </span>

                <dd
                  className="relative mt-8 font-display text-[clamp(2.5rem,5.2vw,3.75rem)] leading-none tabular-nums"
                  style={{ color: "var(--accent)" }}
                >
                  {isPlain ? item.value : <span data-count={item.value}>{item.value}</span>}
                </dd>

                {/* Draws in step with the count, which is what makes the number
                    read as arriving rather than as merely changing. */}
                <span
                  aria-hidden
                  data-fact-bar
                  className="relative mt-5 block h-px w-full origin-left"
                  style={{
                    background:
                      "linear-gradient(to right, var(--accent), transparent 85%)",
                  }}
                />

                <dt
                  className="relative mt-4 font-mono text-[0.6875rem] font-semibold tracking-[0.24em] uppercase"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {item.label}
                </dt>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

/**
 * Atmosphere behind the figures. One photograph — a crew rigging lights on an
 * indoor set — held at low opacity and pinned to the viewport, so the numbers
 * travel across a still frame as you scroll. Pure layout, no GSAP: it costs
 * nothing per frame and cannot fall out of step with the scrollbar.
 */
function FactsBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* The light palette has far less headroom — its muted grey already sits
          near the AA floor on the bare page — so the plate is held to a fraction
          of the dark theme's strength. Both numbers are set by measurement, not
          by eye; see .qa/factstheme.mjs. */}
      <div className="plate-fixed opacity-[0.20] light:opacity-[0.05]">
        <Image
          src={facts.backdrop}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* The heading and its sub sit top-left, and the sub is the muted grey with
          the least margin on the page. A mask rather than a `transparent → bg`
          gradient, so the ramp is pure alpha and cannot pick up a grey cast from
          interpolating toward a colour. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "var(--bg-elevated)",
          opacity: 0.66,
          maskImage: "radial-gradient(120% 92% at 8% 6%, black 22%, transparent 76%)",
          WebkitMaskImage: "radial-gradient(120% 92% at 8% 6%, black 22%, transparent 76%)",
        }}
      />

      {/* The warm pool that was here before the plate arrived, kept: it ties the
          photograph into the palette rather than letting it sit on top as a
          separate, cooler picture. */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(90% 60% at 50% 0%, var(--accent) 0%, transparent 62%)",
          opacity: 0.07,
        }}
      />

      {/* Feathers the plate into the sections above and below, so the pinned
          frame has no seam where the band starts and stops. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, var(--bg-elevated) 0%, transparent 20%, transparent 80%, var(--bg-elevated) 100%)",
        }}
      />

      <span
        className="absolute inset-x-0 top-0 block h-px"
        style={{
          background: "linear-gradient(to right, transparent, var(--accent) 50%, transparent)",
          opacity: 0.45,
        }}
      />

      <div className="grain absolute inset-0" />
    </div>
  );
}
