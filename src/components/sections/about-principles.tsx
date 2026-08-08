"use client";

import { Building2, Flag } from "lucide-react";
import { aboutPrinciples } from "@/content/about";
import { useReveal } from "@/hooks/use-reveal";

/** One icon per card, in the order the legacy grid set them. */
const ICONS = [Building2, Flag] as const;

export function AboutPrinciples() {
  const scope = useReveal<HTMLElement>({ start: "top 82%", stagger: 0.12 });

  return (
    <section
      ref={scope}
      aria-labelledby="about-principles-heading"
      className="relative py-20 sm:py-24 lg:py-28"
    >
      <div className="container-page">
        <header className="max-w-3xl">
          <p className="reveal eyebrow">{aboutPrinciples.eyebrow}</p>
          {/* The grid itself is the content here — the two cards carry their own
              headings from the source — so the section's accessible name is
              visually hidden rather than invented as a display heading. */}
          <h2 id="about-principles-heading" className="sr-only">
            Company overview and mission
          </h2>
          <span
            aria-hidden
            className="reveal mt-6 block h-px w-24"
            style={{ backgroundColor: "var(--accent)" }}
          />
        </header>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:gap-6">
          {aboutPrinciples.items.map((item, index) => {
            const Icon = ICONS[index] ?? Building2;
            return (
              <article
                key={item.heading}
                className="reveal group relative overflow-hidden rounded-3xl p-8 transition-colors duration-500 sm:p-10 lg:p-12"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--hairline)",
                }}
              >
                {/* Gold wash that arrives on hover. Painted as a layer rather
                    than a background swap so the transition has something to
                    interpolate — gradients do not animate between values. */}
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 62%)",
                  }}
                />
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 block h-px origin-left scale-x-0 transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-x-100"
                  style={{
                    background: "linear-gradient(to right, var(--accent), transparent 75%)",
                  }}
                />

                <div className="relative">
                  <span
                    aria-hidden
                    className="flex size-12 items-center justify-center rounded-full border transition-colors duration-500"
                    style={{ borderColor: "var(--hairline-strong)", color: "var(--accent)" }}
                  >
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>

                  <h3 className="mt-7 display-md font-display">{item.heading}</h3>

                  <span
                    aria-hidden
                    className="mt-5 block h-px w-16 transition-[width] duration-700 ease-[var(--ease-out-quint)] group-hover:w-28"
                    style={{ backgroundColor: "var(--accent)" }}
                  />

                  <p
                    className="mt-6 text-base leading-[1.85]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {item.body}
                  </p>
                </div>

                {/* Oversized index, sitting behind the copy. Decorative. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-2 -bottom-6 font-display text-[7rem] leading-none opacity-[0.05] transition-opacity duration-700 group-hover:opacity-[0.09]"
                  style={{ color: "var(--accent)" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
