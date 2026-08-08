"use client";

import Image from "next/image";
import { ceo } from "@/content/homepage";
import { useReveal } from "@/hooks/use-reveal";

export function CeoMessage() {
  const scope = useReveal<HTMLElement>({ stagger: 0.1 });

  return (
    <section
      ref={scope}
      aria-labelledby="ceo-heading"
      className="relative overflow-hidden py-20 sm:py-28 lg:py-32"
      /* clip-path — not overflow — is what pins the backdrop. It clips the
         subtree without becoming a containing block for fixed descendants, so
         the plate inside stays locked to the viewport while this section
         travels past it. `contain: paint` would clip too, but it *does* take
         over as the containing block, which cancels the whole effect. */
      style={{ backgroundColor: "var(--bg)", clipPath: "inset(0)" }}
    >
      <CeoBackdrop />

      <div className="container-page relative z-10">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          {/* Portrait — the official CEO photograph, never substituted. */}
          <figure className="reveal relative mx-auto w-full max-w-sm lg:mx-0">
            <div
              aria-hidden
              className="absolute -inset-3 rounded-[2rem] border sm:-inset-4"
              style={{ borderColor: "var(--hairline)" }}
            />
            {/* The border sits on this element rather than on the <Image>: a
                border on the image itself would be painted inside the same box
                `object-cover` fills, so the corners would clip it away. */}
            <div
              className="relative aspect-square overflow-hidden rounded-[1.5rem] border"
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderColor: "color-mix(in srgb, var(--accent) 38%, transparent)",
              }}
            >
              <Image
                src={ceo.portrait.src}
                alt={`${ceo.name}, founder of Aruamz Productions`}
                fill
                sizes="(max-width: 1024px) 90vw, 420px"
                className="object-cover object-top"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgb(8 8 8 / 0.55), transparent 55%)",
                }}
              />
            </div>
          </figure>

          <div>
            <p className="reveal eyebrow">{ceo.eyebrow}</p>

            <h2 id="ceo-heading" className="reveal mt-5 display-lg font-display">
              {ceo.name}
            </h2>

            <div
              aria-hidden
              className="reveal mt-7 h-px w-24"
              style={{ backgroundColor: "var(--accent)" }}
            />

            <blockquote className="reveal mt-8">
              <p
                className="text-lg leading-[1.75] sm:text-xl sm:leading-[1.7]"
                style={{ color: "var(--fg-muted)" }}
              >
                <span
                  aria-hidden
                  className="mr-2 font-display text-4xl leading-none align-[-0.25em]"
                  style={{ color: "var(--accent)" }}
                >
                  &ldquo;
                </span>
                {ceo.body}
              </p>
            </blockquote>

            <figure className="reveal mt-10 flex items-center gap-5">
              <Image
                src={ceo.signature.src}
                alt={`Signature of ${ceo.name}`}
                width={ceo.signature.width}
                height={ceo.signature.height}
                sizes="80px"
                /* Dark ink on transparency: inverted for the dark palette. */
                className="h-auto w-20 opacity-80 invert light:invert-0"
              />
              <figcaption
                className="border-l pl-5 text-sm"
                style={{ borderColor: "var(--hairline)", color: "var(--fg-muted)" }}
              >
                <span className="block font-medium" style={{ color: "var(--fg)" }}>
                  Syeda Zahra Shah
                </span>
                Chief Executive Officer
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Atmosphere behind the founder's message. One photograph — a cinema camera
 * rigged in a working studio — held at low opacity and pinned to the viewport,
 * so the copy travels across a still frame as you scroll. No GSAP here: the
 * effect is pure layout, which means it costs nothing per frame and cannot fall
 * out of step with the scrollbar.
 */
function CeoBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* The light palette has far less headroom: its muted body grey already
          sits at 4.8:1 on the bare page, so the plate gets a fifth of the dark
          theme's strength. At 0.06 both the body copy and the eyebrow measured
          inside 0.1 of the 4.5 floor across the scroll sweep — too thin to
          absorb a future copy or asset change. */}
      <div className="plate-fixed opacity-[0.22] light:opacity-[0.045]">
        <Image
          src={ceo.backdrop}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* The copy sits on the right half, so the frame is quietened there and
          left to breathe on the portrait side. Measured, not guessed: without
          this the founder's paragraph reads 3.8:1 against the brightest part of
          the plate, which is under AA. A mask rather than a `transparent → bg`
          gradient, so the ramp is pure alpha and cannot pick up a grey cast
          from interpolating toward a colour. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "var(--bg)",
          opacity: 0.72,
          maskImage: "linear-gradient(to right, transparent 4%, black 54%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 4%, black 54%)",
        }}
      />

      {/* Warms the frame into the palette — the source is close to neutral, and
          a cool grey wash under gold type reads cheap. */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(112% 84% at 22% 18%, var(--accent) 0%, transparent 62%)",
          opacity: 0.09,
        }}
      />

      {/* Feathers the plate into the sections above and below, so the pinned
          frame has no seam where the band starts and stops. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, var(--bg) 0%, transparent 22%, transparent 78%, var(--bg) 100%)",
        }}
      />

      <span
        className="absolute inset-x-0 top-0 block h-px"
        style={{
          background: "linear-gradient(to right, var(--accent), transparent 60%)",
          opacity: 0.5,
        }}
      />

      <div className="grain absolute inset-0" />
    </div>
  );
}
