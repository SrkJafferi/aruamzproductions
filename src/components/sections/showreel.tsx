"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { showreel } from "@/content/homepage";
import { registerGsap } from "@/lib/gsap";

/**
 * Facade pattern: the poster is all that ships until the visitor asks to play,
 * so the Vimeo player never costs anything on first load.
 */
export function Showreel() {
  const root = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);

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
        { opacity: 0, y: 34, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.05,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
          onComplete: () =>
            el.querySelectorAll(".reveal").forEach((node) => node.classList.add("reveal-done")),
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      id="showreel"
      aria-label={showreel.ariaLabel}
      className="relative py-20 sm:py-28 lg:py-32"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="container-page">
        <div
          className="reveal relative aspect-video w-full overflow-hidden rounded-2xl"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        >
          {playing ? (
            <iframe
              src={`${showreel.embedUrl}&autoplay=1`}
              title={showreel.ariaLabel}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label="Play the Aruamz Productions showreel"
              className="group absolute inset-0 size-full"
            >
              <Image
                src={showreel.poster.src}
                alt=""
                fill
                sizes="(max-width: 1280px) 100vw, 1216px"
                className="object-cover object-center transition-transform duration-[1200ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.03]"
              />
              <span
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgb(8 8 8 / 0.7), rgb(8 8 8 / 0.25) 60%, rgb(8 8 8 / 0.4))",
                }}
              />

              <span
                aria-hidden
                className="absolute inset-0 flex items-center justify-center"
              >
                <span
                  className="relative flex size-20 items-center justify-center rounded-full backdrop-blur-sm transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-110 sm:size-24"
                  style={{
                    border: "1px solid var(--accent)",
                    backgroundColor: "rgb(8 8 8 / 0.35)",
                  }}
                >
                  <Play
                    className="size-6 translate-x-0.5 sm:size-7"
                    style={{ color: "var(--accent)" }}
                    fill="currentColor"
                  />
                </span>
              </span>

              <span
                aria-hidden
                className="absolute bottom-5 left-5 font-mono text-[0.6875rem] tracking-[0.28em] text-white/60 uppercase sm:bottom-8 sm:left-8"
              >
                Showreel
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
