"use client";

import { useEffect, useRef } from "react";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";

type Options = {
  /** Selector for the children to stagger in. Defaults to `.reveal`. */
  selector?: string;
  y?: number;
  stagger?: number;
  duration?: number;
  start?: string;
};

/**
 * Fades and lifts `.reveal` descendants into place on scroll. Reduced-motion
 * visitors get the finished state immediately — no tweens are created.
 */
export function useReveal<T extends HTMLElement = HTMLElement>({
  selector = ".reveal",
  y = 28,
  stagger = 0.08,
  duration = 0.9,
  start = "top 82%",
}: Options = {}) {
  const scope = useRef<T>(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((el) => el.classList.add("reveal-done"));
      return;
    }

    const gsap = registerGsap();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start, once: true },
          onComplete: () => targets.forEach((el) => el.classList.add("reveal-done")),
        },
      );
    }, root);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [selector, y, stagger, duration, start]);

  return scope;
}
