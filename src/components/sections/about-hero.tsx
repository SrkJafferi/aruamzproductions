"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronRight, Film } from "lucide-react";
import { aboutHero } from "@/content/about";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { onAppReady } from "@/lib/app-ready";

export function AboutHero() {
  const root = useRef<HTMLElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.querySelectorAll<HTMLElement>("[data-about-hero]").forEach((node) => {
        node.style.opacity = "1";
        node.style.transform = "none";
      });
      return;
    }

    const gsap = registerGsap();
    let stopIntro: (() => void) | undefined;

    const ctx = gsap.context(() => {
      /* The plate drifts slower than the page, exactly as on the homepage, so
         the two heroes read as the same room. */
      gsap.to(plate.current, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });

      /* Type leaves on scroll; the scrim only fades. A full-bleed scrim that
         travels drags its own bottom edge into frame and uncovers the join into
         the next section — the same defect that had to be fixed on the
         homepage hero, so it is not repeated here. */
      gsap.to("[data-about-hero-exit]", {
        opacity: 0,
        y: -34,
        ease: "none",
        scrollTrigger: { trigger: el, start: "45% top", end: "bottom top", scrub: true },
      });
      gsap.to("[data-about-hero-scrim-fade]", {
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "45% top", end: "bottom top", scrub: true },
      });

      stopIntro = onAppReady(() =>
        ctx.add(() => {
          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

          tl.from(frame.current, { scale: 1.14, duration: 2, ease: "power3.out" })
            .from(
              "[data-about-title]",
              { yPercent: 116, duration: 1.4, ease: "expo.out" },
              0.2,
            )
            .from("[data-about-crumb]", { y: 14, opacity: 0, duration: 0.9 }, 0.7)
            .from("[data-about-rule]", { scaleX: 0, duration: 1.4 }, 0.75)
            .from("[data-about-mark]", { scale: 0.6, opacity: 0, duration: 1 }, 0.85)
            .from(
              "[data-about-line]",
              { y: 22, opacity: 0, duration: 0.9, stagger: 0.075 },
              0.95,
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
    /* Centred, because the legacy band is: the row carrying the title and the
       statement is `text-align: center` and its icon is `pull-center`. The
       reference design centres its title band too, so both agree. */
    <section
      ref={root}
      aria-labelledby="about-hero-heading"
      className="relative isolate flex min-h-[86svh] flex-col justify-center overflow-hidden pt-36 pb-24 sm:pt-40 sm:pb-28"
    >
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div ref={plate} className="absolute -inset-y-[10%] inset-x-0">
          <div ref={frame} className="absolute inset-0 will-change-transform">
            <Image
              src={aboutHero.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
              /* Only a light lift. The old plate was a flat grey wall that had
                 to be pushed hard to read at all; this one is a lit studio with
                 real range (mean 65/24/8, full 0–255 spread), so anything more
                 aggressive would blow the softbox and flatten the falloff that
                 makes the frame work. */
              style={{ filter: "brightness(1.12) contrast(1.04)" }}
            />
          </div>
        </div>

        {/* Copy sits centred, so the darkening is centred: a left-to-right ramp
            would leave one half of the statement on brighter wall than the
            other. The outer stop is open, which is what lets the texture read at
            the edges of the frame. The centre stop is lighter than it was for
            the old grey plate — the camera and its softbox are dead centre, and
            at 0.80 the whole subject disappeared behind the type. */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--bg) 1%, rgb(8 8 8 / 0.66) 14%, rgb(8 8 8 / 0.12) 40%, transparent 62%)",
            }}
          />
          <div data-about-hero-scrim-fade className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(78% 62% at 50% 52%, rgb(8 8 8 / 0.66) 0%, rgb(8 8 8 / 0.54) 45%, rgb(8 8 8 / 0.16) 78%, transparent 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom, rgb(8 8 8 / 0.62), transparent 15%)" }}
            />
          </div>
        </div>
        <div className="grain absolute inset-0" />
      </div>

      <div
        data-about-hero-exit
        className="container-page relative z-10 flex flex-col items-center text-center"
      >
        <h1
          id="about-hero-heading"
          className="block overflow-hidden pb-[0.08em] display-hero font-display"
          style={{ color: "var(--accent)" }}
        >
          <span data-about-hero data-about-title className="block">
            {aboutHero.heading}
          </span>
        </h1>

        {/* Breadcrumb, set under the title exactly as the reference design has
            it — the only navigational furniture on the page, so it stays quiet
            and small. */}
        <nav data-about-hero data-about-crumb aria-label="Breadcrumb" className="mt-6">
          <ol className="flex flex-wrap items-center justify-center gap-2 font-mono text-[0.6875rem] font-semibold tracking-[0.24em] text-white/60 uppercase">
            {aboutHero.breadcrumb.map((crumb, index) => {
              const last = index === aboutHero.breadcrumb.length - 1;
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
          data-about-hero
          data-about-rule
          aria-hidden
          className="mt-9 block h-px w-full max-w-xs"
          style={{
            background:
              "linear-gradient(to right, transparent, var(--accent) 50%, transparent)",
          }}
        />

        {/* The film icon the legacy band centres above the statement. */}
        <span
          data-about-hero
          data-about-mark
          aria-hidden
          className="mt-9 flex size-16 items-center justify-center rounded-full border backdrop-blur-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
            color: "var(--accent)",
            backgroundColor: "rgb(8 8 8 / 0.35)",
          }}
        >
          <Film className="size-7" strokeWidth={1.4} />
        </span>

        {/* The opening statement. The client sets it as two lines rather than a
            single run of prose, and that break is their own typesetting, so
            each line keeps its own row. The measure opens up at `lg` because at
            42rem both lines wrap again and the two-line setting is lost — the
            whole point of closing the breaks up. It stays one <p> so a screen
            reader still reads it as one statement. */}
        <p className="mt-9 max-w-2xl sm:max-w-3xl lg:max-w-4xl">
          <span
            data-about-hero
            data-about-line
            className="block display-md font-display text-white"
          >
            {aboutHero.lead}
          </span>
          {aboutHero.statement.map((line) => (
            <span
              key={line}
              data-about-hero
              data-about-line
              className="mt-2.5 block text-base leading-[1.7] text-white/75 sm:text-lg sm:leading-[1.65]"
            >
              {line}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
