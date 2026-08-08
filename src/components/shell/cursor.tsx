"use client";

import { useEffect, useRef, useState } from "react";
import { registerGsap } from "@/lib/gsap";
import { useMediaQuery, useReducedMotion } from "@/hooks/use-media-query";

/**
 * Pointer-only cursor: a small gold dot plus a trailing ring that grows over
 * anything interactive. Never mounted on touch devices or under reduced motion.
 */
export function Cursor() {
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = useReducedMotion();
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!fine || reduced) return;

    const gsap = registerGsap();
    const moveDot = gsap.quickTo(dot.current, "x", { duration: 0.12, ease: "power3.out" });
    const moveDotY = gsap.quickTo(dot.current, "y", { duration: 0.12, ease: "power3.out" });
    const moveRing = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3.out" });
    const moveRingY = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3.out" });

    const onMove = (event: PointerEvent) => {
      setVisible(true);
      moveDot(event.clientX);
      moveDotY(event.clientY);
      moveRing(event.clientX);
      moveRingY(event.clientY);
    };

    const interactive = "a, button, [role='button'], input, textarea, summary";
    const onOver = (event: PointerEvent) => {
      const hot = (event.target as Element | null)?.closest(interactive);
      gsap.to(ring.current, {
        scale: hot ? 1.9 : 1,
        opacity: hot ? 0.9 : 0.5,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const onLeave = () => setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [fine, reduced]);

  if (!fine || reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[150] transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        ref={dot}
        className="absolute -left-[3px] -top-[3px] size-1.5 rounded-full"
        style={{ backgroundColor: "var(--accent)" }}
      />
      <div
        ref={ring}
        className="absolute -left-5 -top-5 size-10 rounded-full border opacity-50"
        style={{ borderColor: "var(--accent)" }}
      />
    </div>
  );
}
