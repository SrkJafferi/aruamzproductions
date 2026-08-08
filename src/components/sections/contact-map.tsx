"use client";

import { useState } from "react";
import { ArrowUpRight, MapPin, MousePointerClick } from "lucide-react";
import { contactMap, contactOffice } from "@/content/contact";
import { useReveal } from "@/hooks/use-reveal";

export function ContactMap() {
  const scope = useReveal<HTMLElement>({ y: 24, stagger: 0.08 });
  /* The embed zooms on wheel, which hijacks the page scroll the moment a
     pointer crosses it — a shield holds the map inert until it is asked for. */
  const [live, setLive] = useState(false);

  return (
    <section
      ref={scope}
      /* The legacy page prints no heading above its map, so none is invented —
         the section takes its accessible name from a label instead. */
      aria-label={contactMap.label}
      className="relative"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 block h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 55%, transparent) 30%, color-mix(in srgb, var(--accent) 55%, transparent) 70%, transparent)",
        }}
      />

      {/* 580px is the legacy shortcode's own height; it only gives that up on a
          short viewport, where a fixed 580px would swallow the screen. */}
      <div className="reveal relative h-[clamp(22rem,58vh,36.25rem)] w-full overflow-hidden">
        {/* Google's keyless embed. Inverted and hue-rotated back so the map sits
            in the page's palette instead of punching a white slab through it —
            the tiles themselves are untouched, this is a display filter. */}
        <iframe
          title={contactMap.label}
          src={contactMap.embed}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
          style={{
            filter: "invert(0.92) hue-rotate(180deg) saturate(0.6) brightness(0.95) contrast(0.9)",
          }}
        />

        {/* Feathered edges so the map dissolves into the sections above and
            below rather than butting against them. The bottom stop is deliberately
            weak: Google's attribution sits in that strip and has to stay legible.
            Never interactive. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, var(--bg) 0%, transparent 18%, transparent 88%, color-mix(in srgb, var(--bg) 72%, transparent) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{
            background:
              "linear-gradient(to right, var(--bg) 0%, transparent 22%, transparent 78%, var(--bg) 100%)",
          }}
        />

        {live ? null : (
          <button
            type="button"
            onClick={() => setLive(true)}
            className="group absolute inset-0 z-10 flex cursor-pointer items-center justify-center"
            style={{ backgroundColor: "rgb(8 8 8 / 0.32)" }}
          >
            <span
              className="inline-flex min-h-11 items-center gap-2.5 rounded-full border px-5 py-3 font-mono text-[0.6875rem] font-semibold tracking-[0.2em] uppercase backdrop-blur-md transition-all duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-0.5 group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]"
              style={{
                borderColor: "rgb(255 255 255 / 0.22)",
                backgroundColor: "rgb(8 8 8 / 0.78)",
                color: "rgb(255 255 255 / 0.92)",
              }}
            >
              <MousePointerClick aria-hidden className="size-3.5" />
              Click to explore the map
            </span>
          </button>
        )}

        {/* The address, repeated over the map so the pin has a caption. It sits
            above the shield and stays clickable once the map is live. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
          <div className="container-page pb-6 sm:pb-8">
            <div
              className="reveal pointer-events-auto inline-flex max-w-full flex-col gap-4 rounded-2xl border p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:p-6"
              style={{
                borderColor: "var(--hairline-strong)",
                backgroundColor: "rgb(8 8 8 / 0.82)",
              }}
            >
              {/* Stacked, this card is tall enough to sit over the pin it is
                  captioning. Pairing the mark with the address on one line gives
                  the marker back roughly sixty pixels of map; `sm:contents`
                  dissolves the wrapper again once the row layout takes over. */}
              <span className="flex items-center gap-4 sm:contents">
                <span
                  aria-hidden
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <MapPin className="size-5" strokeWidth={1.6} />
                </span>

                <span className="min-w-0">
                  <span
                    data-ct-map-eyebrow
                    className="block font-mono text-[0.625rem] font-semibold tracking-[0.2em] text-white/65 uppercase"
                  >
                    {contactOffice.heading}
                  </span>
                  <span
                    data-ct-map-address
                    className="mt-1.5 block text-sm leading-relaxed text-white/90 sm:text-base"
                  >
                    {contactOffice.street}, {contactOffice.city}
                  </span>
                </span>
              </span>

              <a
                href={contactMap.directions.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-full border px-5 py-3 font-mono text-[0.6875rem] font-semibold tracking-[0.2em] text-white/90 uppercase transition-all duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] sm:ml-2"
                style={{ borderColor: "rgb(255 255 255 / 0.2)" }}
              >
                {contactMap.directions.label}
                <ArrowUpRight
                  aria-hidden
                  className="size-3.5 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
