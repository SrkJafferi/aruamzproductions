"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Play } from "lucide-react";
import { hero } from "@/content/homepage";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { onAppReady } from "@/lib/app-ready";

/** "ARUAMZ PRODUCTIONS" → one masked line per word. */
const LINES = hero.headline.split(" ");

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.querySelectorAll<HTMLElement>("[data-hero]").forEach((node) => {
        node.style.opacity = "1";
        node.style.transform = "none";
      });
      return;
    }

    const gsap = registerGsap();
    let stopIntro: (() => void) | undefined;

    const ctx = gsap.context(() => {
      /* The plate drifts slower than the page, so the type lifts off the film. */
      gsap.to(plate.current, {
        yPercent: 14,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });

      /* Type and scrim fade out as the next section arrives. */
      gsap.to(el.querySelectorAll("[data-hero-exit]"), {
        opacity: 0,
        y: -40,
        ease: "none",
        scrollTrigger: { trigger: el, start: "40% top", end: "bottom top", scrub: true },
      });

      /* The intro is built later, once the curtain lifts. It has to go through
         ctx.add(): selector strings only resolve against the context scope
         during synchronous execution, so building it straight inside the
         callback silently targets nothing — and leaks past ctx.revert(). */
      stopIntro = onAppReady(() =>
        ctx.add(() => {
          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

          tl.from(frame.current, { scale: 1.16, duration: 2.2, ease: "power3.out" })
            .from("[data-hero-rail]", { scaleY: 0, duration: 1.4 }, 0.1)
            .from("[data-hero-eyebrow]", { yPercent: 120, opacity: 0, duration: 1 }, 0.25)
            .from(
              "[data-hero-line]",
              { yPercent: 118, duration: 1.5, stagger: 0.12, ease: "expo.out" },
              0.35,
            )
            .from("[data-hero-rule]", { scaleX: 0, duration: 1.5 }, 0.9)
            .from("[data-hero-fade]", { y: 26, opacity: 0, duration: 1.1, stagger: 0.09 }, 1.05)
            .from(
              "[data-hero-badge]",
              { y: 22, opacity: 0, duration: 1, stagger: 0.11, ease: "power3.out" },
              1.25,
            );

          /* The beam falling down the cue track — the only looping motion here.
             fromTo, not to: a from-tween would leave the beam parked mid-track
             between repeats, and the loop has to start off-screen every pass. */
          gsap.fromTo(
            "[data-hero-cue]",
            { yPercent: -110 },
            {
              yPercent: 210,
              duration: 1.9,
              repeat: -1,
              repeatDelay: 0.35,
              ease: "power2.inOut",
              delay: 2.2,
            },
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

  /* Autoplay can be refused (low-power mode, data saver). The poster stays put
     underneath, so a refusal degrades to a still frame rather than a black box. */
  useEffect(() => {
    const node = video.current;
    if (!node) return;
    node.play().catch(() => {});
  }, []);

  return (
    <section
      ref={root}
      aria-label="Aruamz Productions introduction"
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden pt-32 pb-12 sm:pt-36 sm:pb-16 lg:pb-20 [@media(max-height:800px)]:pt-24 [@media(max-height:800px)]:pb-10 [@media(max-height:800px)]:sm:pt-24 [@media(max-height:800px)]:lg:pb-10"
    >
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div ref={plate} className="absolute -inset-y-[12%] inset-x-0">
          <div ref={frame} className="absolute inset-0 will-change-transform">
            <Image
              src={hero.poster}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <video
              ref={video}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              poster={hero.poster}
              className="absolute inset-0 size-full object-cover object-center"
            >
              {/* Order is deliberate: the phone-sized mp4 is offered first so a
                  narrow screen takes the 508KB rendition instead of the 3.3MB
                  WebM. `media` is only honoured on the first matching source,
                  which is why the narrowest constraint has to lead. */}
              <source src={hero.video.sd} type="video/mp4" media="(max-width: 640px)" />
              <source src={hero.video.webm} type="video/webm" />
              <source src={hero.video.hd} type="video/mp4" />
            </video>
          </div>
        </div>

        {/* The scrim, in four directional layers rather than one flat wash.

            A uniform vertical gradient was the wrong tool here: every piece of
            hero type — eyebrow, headline, tagline, buttons, rail marker, scroll
            cue — lives in the left column and runs from 21% of the height right
            down to the bottom, so there is no horizontal band that can be
            lightened without putting words on bare footage. Darkening by
            *column* instead of by row leaves the entire right-hand side of the
            frame open, which is where the picture actually gets to be seen.

            The layers are wrapped so they fade out together on scroll — a
            partial fade would show the seams between them. */}
        <div data-hero-exit className="absolute inset-0">
          {/* 1. Bottom: the deepest layer, under the headline block, and the
                 handoff into the next section's background. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--bg) 2%, rgb(8 8 8 / 0.78) 22%, rgb(8 8 8 / 0.30) 46%, transparent 64%)",
            }}
          />
          {/* 2. Left: carries the type that the vertical layer no longer
                 reaches — the eyebrow up at 79% of the height, and the vertical
                 EST. marker down the rail. Gone by 60% across, so it never
                 touches the open half.

                 Gold at 11px is small text by WCAG, so the eyebrow needs 4.5:1,
                 not the 3:1 the headline gets — which is why this layer is the
                 heaviest of the four despite covering the least frame. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgb(8 8 8 / 0.86) 0%, rgb(8 8 8 / 0.58) 26%, rgb(8 8 8 / 0.2) 44%, transparent 60%)",
            }}
          />
          {/* 2b. Below lg the copy is no longer in a column — the headline and
                  eyebrow run the full width — so layer 2 runs out from under
                  them and the eyebrow lands at 4.6:1, barely over the 4.5
                  floor and only across the frames we sampled. A flat wash
                  fixes it, and it costs nothing here: there is no open right
                  half to keep clear at this width. */}
          <div
            className="absolute inset-0 lg:hidden"
            style={{ background: "rgb(8 8 8 / 0.22)" }}
          />
          {/* 3. Top: a short strip for the navbar, which is transparent until
                 you scroll and until then has nothing behind it but footage. */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgb(8 8 8 / 0.58), transparent 15%)",
            }}
          />
          {/* 4. Vignette, kept light — it is holding the corners together now,
                 not doing the legibility work. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 90% at 72% 34%, transparent 48%, rgb(8 8 8 / 0.34) 100%)",
            }}
          />
        </div>
        <div className="grain absolute inset-0" />
      </div>

      {/* Left rail — vertical marker with a rule that draws up to it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-14 flex-col items-center justify-end gap-6 pb-20 lg:flex"
      >
        <span
          data-hero
          data-hero-rail
          className="w-px flex-1 origin-bottom"
          style={{ background: "linear-gradient(to top, var(--accent), transparent)" }}
        />
        <span
          data-hero
          data-hero-fade
          className="font-mono text-[0.625rem] tracking-[0.32em] text-white/50 [writing-mode:vertical-rl]"
        >
          {hero.marker}
        </span>
      </div>

      <div data-hero-exit className="container-page relative z-10">
        <span className="block overflow-hidden">
          <span data-hero data-hero-eyebrow className="eyebrow block">
            {hero.eyebrow}
          </span>
        </span>

        <h1 className="mt-6 display-hero font-display text-white sm:mt-7 [@media(max-height:800px)]:mt-4">
          {LINES.map((word) => (
            /* Each word rides inside its own clipping mask so the line slides up
               from nothing instead of fading in place. */
            <span key={word} className="block overflow-hidden pb-[0.08em]">
              <span data-hero data-hero-line className="block">
                {word}
              </span>
            </span>
          ))}
        </h1>

        <span
          data-hero
          data-hero-rule
          aria-hidden
          className="mt-9 block h-px w-full max-w-sm origin-left [@media(max-height:800px)]:mt-6"
          style={{ background: "linear-gradient(to right, var(--accent), transparent)" }}
        />

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-14">
          <div className="max-w-md">
            <p
              data-hero
              data-hero-fade
              className="text-lg leading-relaxed sm:text-xl"
              style={{ color: "var(--fg)" }}
            >
              {hero.tagline}
            </p>

            <div data-hero data-hero-fade className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="#projects" className="btn-primary">
                View our work
              </Link>
              <Link href="#showreel" className="btn-ghost">
                <Play className="size-4" aria-hidden />
                Watch showreel
              </Link>
            </div>
          </div>

          {/* The legacy laurels. They sit beside the tagline on wide screens
              rather than under it, so adding them costs no fold height. */}
          {/* The laurel artwork already carries its discipline inside the wreath,
              so the label lives in alt text only — a caption underneath would
              just print the same three words twice. */}
          <ul className="flex shrink-0 items-center gap-7 sm:gap-10">
            {hero.badges.map((badge) => (
              <li key={badge.label} data-hero data-hero-badge>
                <Image
                  src={badge.src}
                  alt={badge.label}
                  width={badge.width}
                  height={badge.height}
                  className="h-16 w-auto sm:h-20"
                  style={{ filter: "drop-shadow(0 2px 10px rgb(8 8 8 / 0.85))" }}
                />
              </li>
            ))}
          </ul>
        </div>

        <div
          data-hero
          data-hero-fade
          className="mt-10 flex items-center justify-between gap-6 border-t pt-6 sm:mt-12 [@media(max-height:800px)]:mt-7 [@media(max-height:800px)]:pt-5 [@media(max-height:800px)]:sm:mt-7"
          style={{ borderColor: "var(--hairline)" }}
        >
          {/* A gold beam falling down a hairline track, rather than a bouncing
              arrow. The track is masked, so the beam appears out of nothing at
              the top and dissolves at the bottom — the motion reads as
              direction without a literal icon. */}
          <Link href="#showreel" className="group flex items-center gap-4">
            <span
              aria-hidden
              className="relative block h-10 w-px overflow-hidden"
              style={{ background: "var(--hairline-strong)" }}
            >
              <span
                data-hero-cue
                className="absolute inset-x-0 top-0 block h-1/2"
                style={{
                  background: "linear-gradient(to bottom, transparent, var(--accent))",
                }}
              />
            </span>
            <span className="font-mono text-[0.6875rem] font-semibold tracking-[0.28em] text-white/55 uppercase transition-colors duration-300 group-hover:text-[var(--accent)]">
              {hero.scrollHint}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
