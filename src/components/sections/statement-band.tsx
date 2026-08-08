"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Clapperboard, Film, PlaySquare, Video } from "lucide-react";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";

type Statement = {
  readonly eyebrow: string;
  readonly heading: string;
  readonly body: string;
  readonly image: string;
};

type Cta = { readonly label: string; readonly href: string };

/* Resolved here rather than passed in. A Lucide icon is a forwardRef object, and
   handing one from the server page to this client component is not serialisable
   — the build fails on it. The caller sends a key instead. */
const ICONS = {
  video: Video,
  results: PlaySquare,
  dreams: Clapperboard,
  documentary: Film,
} as const;

/**
 * The full-bleed statement bands shared by the About and Our Services pages.
 * Both are a heading, a paragraph and a plate — identical in structure, which
 * is exactly why they must not be identical in layout. `variant` picks which
 * way the band is composed:
 *
 * - `split`   — plate full-bleed behind, copy held to the left column
 * - `centred` — plate full-bleed behind, copy centred and narrow
 *
 * `plate` picks how that frame behaves on scroll: `parallax` drifts it with the
 * band, `fixed` pins it to the viewport so the copy travels across a still
 * frame — the same treatment as the founder's message on the homepage.
 */
export function StatementBand({
  id,
  content,
  icon,
  variant,
  plate = "parallax",
  cta,
}: {
  id: string;
  content: Statement;
  icon: keyof typeof ICONS;
  variant: "split" | "centred";
  plate?: "parallax" | "fixed";
  cta?: readonly Cta[];
}) {
  const Icon = ICONS[icon];
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
        { opacity: 0, y: 32 },
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

      /* The plate is 112% tall and starts 6% high, so a 9% drift never exposes
         an edge — the same margins the homepage's band uses. A pinned plate is
         already stationary and must not be transformed: a transform on it would
         also make it a containing block for anything fixed inside. */
      if (plate === "parallax") {
        gsap.to(media.current, {
          yPercent: -9,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        });
      }
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [plate]);

  const centred = variant === "centred";
  const pinned = plate === "fixed";

  return (
    <section
      ref={root}
      aria-labelledby={`${id}-heading`}
      className="relative overflow-hidden py-24 sm:py-32 lg:py-36"
      /* clip-path, not overflow, is what trims a viewport-pinned plate back to
         this band — `overflow: hidden` does not clip a fixed descendant. It is
         only set when the plate is pinned, because clipping also costs a
         compositing layer for nothing when it is not. */
      style={pinned ? { clipPath: "inset(0)" } : undefined}
    >
      <div
        ref={media}
        className={pinned ? "plate-fixed" : "absolute inset-x-0 -top-[6%] h-[112%]"}
      >
        <Image
          src={content.image}
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
          background: centred
            ? /* Copy sits centred, so the darkening has to be centred too —
                 a left-to-right ramp would leave the right half of the
                 paragraph on brighter footage than the left. */
              "radial-gradient(120% 100% at 50% 50%, rgb(8 8 8 / 0.90) 0%, rgb(8 8 8 / 0.86) 45%, rgb(8 8 8 / 0.78) 100%)"
            : "linear-gradient(to right, rgb(8 8 8 / 0.93) 0%, rgb(8 8 8 / 0.85) 52%, rgb(8 8 8 / 0.55) 100%)",
        }}
      />
      {/* The split ramp keeps its dark end under the left column, which is where
          the copy sits from `lg` up. Below that the column is the full width of
          the band, so the open end of the ramp ends up behind the paragraph —
          this makes up the difference on small screens only. */}
      {centred ? null : (
        <div
          aria-hidden
          className="absolute inset-0 lg:hidden"
          style={{ backgroundColor: "rgb(8 8 8 / 0.3)" }}
        />
      )}
      <div aria-hidden className="grain absolute inset-0" />

      <div className="container-page relative z-10">
        <div
          className={
            centred ? "mx-auto max-w-3xl text-center" : "max-w-3xl lg:max-w-[46rem]"
          }
        >
          <span
            aria-hidden
            className={`reveal flex size-14 items-center justify-center rounded-full border backdrop-blur-sm ${
              centred ? "mx-auto" : ""
            }`}
            style={{
              borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
              color: "var(--accent)",
              backgroundColor: "rgb(8 8 8 / 0.35)",
            }}
          >
            <Icon className="size-6" strokeWidth={1.4} />
          </span>

          <p className="reveal mt-8 eyebrow">{content.eyebrow}</p>

          <h2
            id={`${id}-heading`}
            className="reveal mt-5 display-lg font-display text-white"
          >
            {content.heading}
          </h2>

          <span
            aria-hidden
            className={`reveal mt-8 block h-px w-24 ${centred ? "mx-auto" : ""}`}
            style={{ backgroundColor: "var(--accent)" }}
          />

          <p
            className={`reveal mt-8 text-base leading-[1.85] text-white/70 sm:text-lg ${
              centred ? "mx-auto max-w-2xl" : ""
            }`}
          >
            {content.body}
          </p>

          {/* The page's only call to action, and it belongs on this band: the
              paragraph above it is the one that talks about meeting a client's
              objectives, so the two next steps sit directly under it. */}
          {cta ? (
            <div
              className={`reveal mt-10 flex flex-wrap items-center gap-3 sm:gap-4 ${
                centred ? "justify-center" : ""
              }`}
            >
              {cta.map((action, index) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`group ${index === 0 ? "btn-primary" : "btn-ghost"}`}
                >
                  {action.label}
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-1"
                  />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
