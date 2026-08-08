"use client";

import { useEffect, useRef, useState } from "react";
import { registerGsap } from "@/lib/gsap";
import { markAppReady } from "@/lib/app-ready";

/**
 * Branded first-paint curtain. It never blocks longer than `MAX_MS`, so a slow
 * network can't strand the visitor behind the overlay.
 */
const MAX_MS = 2200;

export function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.style.overflow = "hidden";

    const finish = () => {
      document.documentElement.style.overflow = "";
      setDone(true);
      markAppReady();
    };

    if (reduced) {
      finish();
      return;
    }

    const gsap = registerGsap();
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish });
      tl.to(bar.current, { scaleX: 1, duration: 1.1, ease: "power2.out" })
        .to(el.querySelectorAll("[data-loader-fade]"), {
          opacity: 0,
          y: -12,
          duration: 0.45,
          ease: "power2.out",
        })
        .to(el, { yPercent: -100, duration: 0.85, ease: "expo.out" }, "-=0.2");
    }, el);

    const bail = window.setTimeout(finish, MAX_MS);
    return () => {
      window.clearTimeout(bail);
      ctx.revert();
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={root}
      aria-hidden
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div data-loader-fade className="text-center">
        <p className="eyebrow">Aruamz Productions</p>
        <p
          className="mt-3 font-display text-2xl tracking-tight sm:text-3xl"
          style={{ color: "var(--fg)" }}
        >
          We turn stories into visuals
        </p>
      </div>
      <div
        data-loader-fade
        className="h-px w-40 overflow-hidden sm:w-56"
        style={{ backgroundColor: "var(--hairline-strong)" }}
      >
        <span
          ref={bar}
          className="block h-full w-full origin-left scale-x-0"
          style={{ backgroundColor: "var(--accent)" }}
        />
      </div>
    </div>
  );
}
