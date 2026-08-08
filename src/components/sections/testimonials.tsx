"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Quote } from "lucide-react";
import { testimonials } from "@/content/homepage";
import { cn } from "@/lib/utils";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { useReveal } from "@/hooks/use-reveal";

const items = testimonials.items;
/** Long enough to read the longest quote here without hurrying. */
const DWELL_MS = 8200;
/* Scroll distance each quote holds the pin for, as a share of the viewport.
   Six steps at half a screen each is a little over three screens of extra
   scroll for the whole band — enough that a quote is arrived at rather than
   flicked past, short enough that nobody feels held hostage. */
const STEP_VH = 0.5;

/* Gold motes drifting behind the quotes. Two populations rather than one: a few
   large, very soft discs that read as out-of-focus bokeh and carry the depth,
   and a larger number of small bright specks that carry the sparkle. One size of
   dot at one opacity reads as a screensaver; the split is what makes it look
   like atmosphere. */
const PARTICLE_COUNT = 26;

/* Laid out from a seeded generator, never Math.random(). These nodes are
   server-rendered, and a random position would differ between the HTML React
   sent and the tree it builds on the client — React would then throw away the
   markup it was handed. A cheap LCG is deterministic on both sides and still
   looks unpatterned. */
const particles = (() => {
  let seed = 0x9e37;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    // Every fourth mote is a bokeh disc; the rest are specks.
    const bokeh = i % 4 === 0;
    return {
      bokeh,
      left: rnd() * 100,
      top: rnd() * 100,
      size: bokeh ? 26 + rnd() * 46 : 2 + rnd() * 3.5,
      /* Bokeh drifts slower than the specks. Parallax by speed alone — nothing
         here is scroll-linked, so the depth has to come from the motion. */
      rise: bokeh ? 26 + rnd() * 14 : 14 + rnd() * 12,
      sway: (bokeh ? 24 : 12) + rnd() * 26,
      delay: rnd() * -30,
      twinkle: 2.6 + rnd() * 3.4,
      opacity: bokeh ? 0.05 + rnd() * 0.05 : 0.22 + rnd() * 0.34,
    };
  });
})();

export function Testimonials() {
  const scope = useReveal<HTMLElement>({ stagger: 0.1 });
  const [active, setActive] = useState(0);
  /* Auto-advance stops for good once the visitor picks a name. Pausing on hover
     alone is not enough: someone reading a quote they chose should never have it
     pulled out from under them because the pointer drifted off. */
  const [claimed, setClaimed] = useState(false);
  /* The rotation is gated on the band being on screen. Ungated it starts at
     mount, so by the time anyone has scrolled this far it has already cycled
     several times and they land on whichever quote the clock happened to reach
     — the first voice a visitor meets should be the first one, not a lottery.
     Every crossfade in between was also animation work done for an empty room. */
  const [inView, setInView] = useState(false);
  /* True while the pinned sequence owns the selection. The timer and the scroll
     must never both be driving: two sources fighting over one index reads as the
     band skipping quotes at random. */
  const [scrollDriven, setScrollDriven] = useState(false);
  const quoteRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const prevHeight = useRef(0);
  const uid = useId();

  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;

  const pick = useCallback((index: number) => {
    /* While pinned, the scroll position *is* the selection. Setting the index
       directly would leave the two disagreeing and the very next wheel event
       would yank the visitor back to whatever step the scrollbar still said they
       were on — so a click scrolls to that step and lets the trigger do the
       selecting. */
    const st = stRef.current;
    if (st) {
      const span = st.end - st.start;
      /* Nudged inside the range rather than landing on st.start / st.end
         exactly. The last step's target *is* the scroll offset where the pin
         releases, so picking the last name used to drop the visitor on the one
         frame the band lets go — they arrive at the quote and it immediately
         scrolls out from under them, and anything pressed next has no pin left
         to steer. A whole step is 1/12 of the span, so 24px is far too small to
         change which quote the trigger rounds to. */
      const inset = Math.min(24, span / 24);
      const target = st.start + (span * index) / (items.length - 1);
      window.scrollTo({
        top: Math.min(st.end - inset, Math.max(st.start + inset, target)),
        behavior: "smooth",
      });
      return;
    }
    setClaimed(true);
    setActive(index);
  }, []);

  useEffect(() => {
    const node = scope.current;
    if (!node) return;
    /* A negative margin on both edges rather than a ratio threshold: this band
       is taller than a phone viewport, so it can never reach a 0.35 ratio there
       and a threshold would simply never fire. This asks the plainer question —
       does the band overlap the middle 60% of the screen. */
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "-20% 0px -20% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [scope]);

  /* On a wide screen the band pins and the quotes step forward with the scroll,
     one per half-screen. Narrow screens keep the gentle timer instead: pinning a
     column that is already taller than a phone viewport leaves nothing on screen
     to pin, and taking over the scroll on a touch device to do it is worse than
     the thing it buys. */
  useEffect(() => {
    const pin = pinRef.current;
    if (!pin) return;
    const gsap = registerGsap();
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const st = ScrollTrigger.create({
          trigger: pin,
          /* Parked under the navbar with whatever slack the viewport has, rather
             than at a flat "top top" that would tuck the heading behind the
             header. If the band is somehow taller than the screen there is no
             offset that shows all of it, so it centres and loses a little at
             both ends instead of all of it at one. */
          start: () => {
            const slack = window.innerHeight - pin.offsetHeight;
            if (slack < 0) return "center center";
            return `top top+=${Math.max(0, Math.min(112, slack - 24))}`;
          },
          end: () =>
            `+=${Math.round(window.innerHeight * STEP_VH) * (items.length - 1)}`,
          pin,
          /* No anticipatePin. It engages the pin a beat early, and measured
             against a scroll crawl that showed as the heading sitting 28px
             lower for two samples at the boundary — a visible hop into the
             sequence, which is exactly what a pin is supposed to prevent. */
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const i = Math.min(
              items.length - 1,
              Math.round(self.progress * (items.length - 1)),
            );
            setActive((prev) => (prev === i ? prev : i));
          },
        });
        stRef.current = st;
        setScrollDriven(true);
        return () => {
          stRef.current = null;
          setScrollDriven(false);
        };
      },
    );

    return () => mm.revert();
  }, []);

  /* The drift. Three separate tweens per mote instead of one path: rise, sway
     and twinkle all run at their own period, so the motion never resolves into
     a visible loop the way a single keyframed path does.
     Gated on `inView` as well as reduced motion — 26 elements tweening three
     properties each is work worth stopping while the band is off screen. */
  useEffect(() => {
    const root = particlesRef.current;
    if (!root) return;
    /* Ambient decorative motion in the periphery is exactly what the setting is
       for, so under reduce the motes stay where they were laid out: still
       visible as texture, simply not moving. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gsap = registerGsap();
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>("[data-mote]").forEach((el) => {
        const rise = Number(el.dataset.rise);
        const sway = Number(el.dataset.sway);
        const delay = Number(el.dataset.delay);
        const twinkle = Number(el.dataset.twinkle);
        const peak = Number(el.dataset.opacity);

        /* Rises a full section height and wraps. `yPercent` on the element's own
           height would be a few pixels for a 3px speck, so the travel is in vh —
           the mote crosses the band rather than jiggling in place. */
        gsap.fromTo(
          el,
          { yPercent: 0 },
          {
            yPercent: -1400,
            duration: rise,
            ease: "none",
            repeat: -1,
            delay,
          },
        );
        // Sway is a yoyo on its own clock, so it does not stay in step with the
        // rise and trace the same diagonal every pass.
        gsap.to(el, {
          x: sway,
          duration: rise / 3.2,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay,
        });
        gsap.to(el, {
          opacity: peak,
          duration: twinkle,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: delay / 2,
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (scrollDriven || claimed || !inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % items.length),
      DWELL_MS,
    );
    return () => window.clearInterval(timer);
  }, [claimed, inView, scrollDriven]);

  /* The card hugs its quote, so its height changes with every step. Tweened from
     the height it just had to the one it now wants, rather than snapping: the
     rail beside it is the taller column and sets the row height, so this moves
     nothing else on the page — it just stops the attribution jumping.
     Layout effect, not a plain one: the measurement has to happen after React
     has committed the new quote but before the browser paints it. */
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const to = el.offsetHeight;
    const from = prevHeight.current;
    prevHeight.current = to;
    // A first paint has nothing to move from, and a resize leaves a stale
    // reading that is not worth tweening through.
    if (!from || Math.abs(to - from) < 8) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gsap = registerGsap();
    const tween = gsap.fromTo(
      el,
      { height: from },
      {
        height: to,
        duration: 0.5,
        ease: "power2.out",
        /* Scrolling fast steps through several quotes before any one tween has
           finished. Without this they stack and the card lands on whichever
           height the last stale tween was still heading for. */
        overwrite: "auto",
        // Handed back to CSS at the end, or the card would be frozen at one
        // pixel height and stop responding to a window resize.
        clearProps: "height",
      },
    );
    return () => {
      tween.kill();
    };
  }, [active]);

  /* Crossfades the quote on change. The panel is keyed on `active`, so React
     hands us a fresh node each time and there is nothing to tween out of — the
     new one simply arrives. */
  useEffect(() => {
    const node = quoteRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gsap = registerGsap();
    const tween = gsap.fromTo(
      node.children,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.07 },
    );
    // Braced, not a concise arrow: `kill()` returns the Tween, and a cleanup
    // function is required to return void.
    return () => {
      tween.kill();
    };
  }, [active]);

  /* Roving focus, so the rail behaves like the tablist it announces itself as:
     arrows move between clients, Home/End jump to the ends. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const delta =
      event.key === "ArrowDown" || event.key === "ArrowRight" ? 1
      : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1
      : 0;
    let next = active;
    if (delta) next = (active + delta + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    pick(next);
    railRef.current?.querySelector<HTMLButtonElement>(`#${tabId(next)}`)?.focus();
  };

  const current = items[active];

  return (
    <section
      ref={scope}
      aria-labelledby="testimonials-heading"
      /* No overflow-hidden: GSAP pins by switching the element to fixed, and an
         overflow ancestor is the documented way to break that. Nothing here
         needs the clip anyway — the wash is inset-0 and the oversized glyph is
         trimmed by the card's own overflow. */
      className="relative py-20 sm:py-28 lg:py-32"
      style={{ backgroundColor: "var(--bg)" }}
    >
      {/* A wash off the top-left, so the band is lit from the same side as the
          rest of the page rather than reading as a flat panel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(80% 70% at 12% 0%, var(--accent) 0%, transparent 60%)",
          opacity: 0.06,
        }}
      />

      {/* ── Gold particle field ───────────────────────────────────────
          overflow-hidden is safe here and NOT on the section: this layer is a
          sibling of the pinned container, not an ancestor of it, so clipping it
          cannot disable the pin. Motes that rise past the top are trimmed here
          rather than bleeding into the sections above and below. */}
      <div
        ref={particlesRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {particles.map((p, i) => (
          <span
            key={i}
            data-mote
            data-rise={p.rise}
            data-sway={p.sway}
            data-delay={p.delay}
            data-twinkle={p.twinkle}
            data-opacity={p.opacity}
            className="absolute block rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              /* Specks get a soft glow so they read as light rather than as
                 dots; the bokeh discs are a gradient that fades to nothing at
                 the rim, which is what keeps them from looking like circles. */
              background: p.bokeh
                ? "radial-gradient(circle, var(--accent) 0%, transparent 70%)"
                : "var(--accent)",
              boxShadow: p.bokeh ? undefined : `0 0 ${p.size * 3}px var(--accent)`,
              filter: p.bokeh ? "blur(6px)" : undefined,
              // Half the settled value, so the twinkle tween has somewhere to
              // travel from on its first pass.
              opacity: p.opacity / 2,
              willChange: "transform, opacity",
            }}
          />
        ))}
      </div>

      <div ref={pinRef} className="container-page relative z-10">
        <header className="reveal max-w-2xl">
          <p className="eyebrow">Client voices</p>
          <h2 id="testimonials-heading" className="mt-5 display-lg font-display uppercase">
            {testimonials.heading}
          </h2>
        </header>

        {/* items-start, not the default stretch: the rail is the taller column
            and stretch made the quote card match it, which is exactly the dead
            space under the shorter quotes. The card now ends where its text
            ends. */}
        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:gap-16">
          {/* ── Spotlight ─────────────────────────────────────────────── */}
          <div
            ref={cardRef}
            className="reveal relative overflow-hidden rounded-3xl p-8 sm:p-12"
            style={{
              backgroundColor: "color-mix(in srgb, var(--bg-elevated) 82%, transparent)",
              border: "1px solid var(--hairline-strong)",
            }}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 block h-px"
              style={{ background: "linear-gradient(to right, var(--accent), transparent 68%)" }}
            />
            {/* An oversized glyph bled off the corner rather than an icon in the
                flow: it carries the editorial weight the old 28px mark could not,
                and being decorative it stays out of the accessibility tree. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-10 right-2 font-display leading-none select-none"
              style={{ color: "var(--accent)", opacity: 0.1, fontSize: "clamp(9rem,17vw,15rem)" }}
            >
              &rdquo;
            </span>

            <div
              key={active}
              ref={quoteRef}
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId(active)}
              tabIndex={0}
              className="relative"
            >
              <Quote
                aria-hidden
                className="size-6 shrink-0"
                strokeWidth={1.5}
                style={{ color: "var(--accent)" }}
              />

              <blockquote className="mt-7">
                {/* Scaled to the quote's own length: the shortest here is one
                    line and the longest is five, and holding both at one size
                    either strands the short one in white space or crams the
                    long one. */}
                <p
                  className={cn(
                    "font-display leading-[1.5]",
                    current.quote.length > 260
                      ? "text-[clamp(1.0625rem,1.5vw,1.25rem)]"
                      : "text-[clamp(1.1875rem,2.1vw,1.6rem)] leading-[1.45]",
                  )}
                  style={{ color: "var(--fg)" }}
                >
                  {current.quote}
                </p>
              </blockquote>

              <figure className="mt-9 flex items-center gap-4">
                <span
                  aria-hidden
                  className="block h-px w-10 shrink-0"
                  style={{ backgroundColor: "var(--accent)" }}
                />
                <figcaption className="text-sm">
                  <span className="block font-display text-base font-semibold">
                    {current.name}
                  </span>
                  <span className="mt-0.5 block text-xs" style={{ color: "var(--fg-muted)" }}>
                    {current.role}
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>

          {/* ── Client rail ───────────────────────────────────────────── */}
          <div
            ref={railRef}
            role="tablist"
            aria-label="Clients"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="reveal flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, index) => {
              const on = index === active;
              return (
                <button
                  key={item.name}
                  id={tabId(index)}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={panelId}
                  /* Only the selected tab is reachable by Tab; the arrows move
                     within the list. */
                  tabIndex={on ? 0 : -1}
                  onClick={() => pick(index)}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-3 rounded-2xl p-3 text-left transition-colors duration-400",
                    "lg:w-full lg:gap-4 lg:rounded-xl lg:py-3.5 lg:pr-4 lg:pl-5",
                    on ? "bg-[color-mix(in_srgb,var(--bg-elevated)_92%,transparent)]" : "hover:bg-[color-mix(in_srgb,var(--bg-elevated)_58%,transparent)]",
                  )}
                >
                  {/* The marker that says which client is speaking. Scaled rather
                      than faded, so it reads at a glance down the rail. */}
                  <span
                    aria-hidden
                    className="absolute inset-y-2.5 left-0 hidden w-[2px] origin-center rounded-full transition-transform duration-400 lg:block"
                    style={{
                      backgroundColor: "var(--accent)",
                      transform: on ? "scaleY(1)" : "scaleY(0)",
                    }}
                  />
                  <Image
                    src={item.avatar}
                    alt=""
                    width={44}
                    height={44}
                    sizes="44px"
                    className={cn(
                      "size-11 shrink-0 rounded-full object-cover transition-all duration-400",
                      on ? "opacity-100 grayscale-0" : "opacity-60 grayscale group-hover:opacity-90 group-hover:grayscale-0",
                    )}
                  />
                  <span className="hidden min-w-0 lg:block">
                    <span
                      className="block truncate text-sm font-medium transition-colors duration-400"
                      style={{ color: on ? "var(--fg)" : "var(--fg-muted)" }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="mt-0.5 block truncate text-[0.6875rem]"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {item.role}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
