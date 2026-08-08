"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { clients } from "@/content/homepage";
import { registerGsap } from "@/lib/gsap";
import { useReveal } from "@/hooks/use-reveal";

const logos = clients.logos;
/** Seconds for one full pass. Slow enough to read a logo as it goes by. */
const CYCLE_S = 46;

/**
 * The legacy carousel, rebuilt. The list is rendered twice so a −100% translate
 * on the first track lands on an identical frame and the loop has no seam.
 *
 * GSAP rather than the CSS keyframes this used to be, for one reason: pausing.
 * `animation-play-state: paused` stops dead on the frame the pointer arrived on,
 * which reads as the page having hitched. A timeScale tween eases the belt down
 * to a stop and back up again, so hovering feels like slowing something with
 * momentum.
 */
export function Clients() {
  const scope = useReveal<HTMLElement>({ stagger: 0.1 });
  const belt = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = belt.current;
    if (!root) return;
    /* A logo belt is continuous decorative motion in the periphery — precisely
       what the reduced-motion setting is for. The fallback is a static wrapped
       row, not a scrollbar: asking someone who opted out of animation to drag a
       bar sideways to see the rest is a worse answer than simply showing them
       all twelve at once. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* Declared out here so the cleanup can unbind the same function objects the
       listeners were bound with — assigned inside the context, which is what
       owns the tween they close over. */
    let slow = () => {};
    let resume = () => {};

    const gsap = registerGsap();
    const tracks = root.querySelectorAll<HTMLElement>("[data-track]");
    const ctx = gsap.context(() => {
      const loop = gsap.to(tracks, {
        xPercent: -100,
        duration: CYCLE_S,
        ease: "none",
        repeat: -1,
      });
      // Tweening the tween's own timeScale, so the belt has weight: it coasts
      // down to a stop and winds back up rather than switching states.
      const ease = (to: number) =>
        gsap.to(loop, { timeScale: to, duration: 0.55, ease: "power2.out", overwrite: true });
      slow = () => ease(0);
      resume = () => ease(1);
    }, root);

    // Pointer and keyboard both slow it, so a visitor tabbing through the logos
    // is not chasing a moving target.
    root.addEventListener("pointerenter", slow);
    root.addEventListener("pointerleave", resume);
    root.addEventListener("focusin", slow);
    root.addEventListener("focusout", resume);

    return () => {
      /* Listeners come off by hand: ctx.revert() unwinds the tweens and the
         inline transforms, but it has never known about anything added to the
         DOM outside it. */
      root.removeEventListener("pointerenter", slow);
      root.removeEventListener("pointerleave", resume);
      root.removeEventListener("focusin", slow);
      root.removeEventListener("focusout", resume);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={scope}
      aria-label={clients.ariaLabel}
      className="relative overflow-hidden py-16 sm:py-20 lg:py-24"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="container-page">
        <p className="reveal eyebrow text-center">Trusted by</p>
      </div>

      {/* overflow-hidden with no scroll variant. The row used to become
          overflow-x-auto under reduced motion, which is where the horizontal
          scrollbar came from; the fallback below wraps instead. */}
      <div ref={belt} className="reveal relative mt-10 flex overflow-hidden motion-reduce:hidden">
        {/* Edge fades so logos dissolve into the page rather than clipping. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-32"
          style={{ background: "linear-gradient(to right, var(--bg), transparent)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-32"
          style={{ background: "linear-gradient(to left, var(--bg), transparent)" }}
        />

        <ul data-track className="flex shrink-0 items-center gap-4 pr-4 sm:gap-6 sm:pr-6">
          {logos.map((logo) => (
            <LogoPlate key={logo.src} src={logo.src} alt={logo.alt} />
          ))}
        </ul>
        {/* The clone is the seam-filler, not content: it repeats names the first
            track has already announced. */}
        <ul
          data-track
          aria-hidden
          className="flex shrink-0 items-center gap-4 pr-4 sm:gap-6 sm:pr-6"
        >
          {logos.map((logo) => (
            <LogoPlate key={`${logo.src}-clone`} src={logo.src} alt="" />
          ))}
        </ul>
      </div>

      {/* Reduced-motion fallback: every logo, wrapped, nothing to drag. Hidden
          from everyone else so the belt above is the only copy in the tree. */}
      <div className="container-page mt-10 hidden motion-reduce:block">
        <ul className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {logos.map((logo) => (
            <LogoPlate key={`${logo.src}-static`} src={logo.src} alt={logo.alt} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function LogoPlate({ src, alt }: { src: string; alt: string }) {
  return (
    <li className="shrink-0">
      {/* The supplied logos carry their own light backgrounds, so a warm-white
          plate keeps all twelve reading consistently on either theme.

          Shown in their own colours at full strength, on the client's call. The
          desaturation that used to sit here made the belt recede, which is the
          usual reason for it — but these are the marks of real clients, and a
          washed-out mark reads as a weaker credential than a printed one. */}
      <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-xl bg-[#F7F6F3] p-4 transition-transform duration-500 ease-[var(--ease-out-quint)] hover:scale-[1.04] sm:h-28 sm:w-48">
        <Image
          src={src}
          alt={alt}
          width={230}
          height={157}
          sizes="192px"
          className="h-full w-full object-contain"
        />
      </div>
    </li>
  );
}
