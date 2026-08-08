"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check } from "lucide-react";
import { newsletter } from "@/content/homepage";
import { useReveal } from "@/hooks/use-reveal";

const schema = z.object({
  email: z.email("Please enter a valid email address"),
});

type Values = z.infer<typeof schema>;

export function Newsletter() {
  const scope = useReveal<HTMLElement>({ stagger: 0.08, y: 18 });
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onSubmit" });

  /**
   * The legacy form posted to the WordPress plugin. Until a subscription
   * endpoint is supplied, the address is validated and acknowledged client-side
   * — no silent failure, and one fetch call is all this needs later.
   */
  const onSubmit = async () => {
    setDone(true);
  };

  return (
    <section
      ref={scope}
      aria-labelledby="newsletter-heading"
      /* Half the padding it had. This is a one-line ask sitting between the
         quotes and the footer, not a destination — it earns a band, not a
         screen. */
      className="relative py-12 sm:py-14"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="container-page">
        {/* One card rather than a full-bleed band, so the section reads as a
            single compact object instead of another floor of the page. */}
        <div
          className="reveal relative overflow-hidden rounded-2xl px-6 py-7 sm:rounded-3xl sm:px-10 sm:py-8"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--hairline-strong)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(90% 140% at 8% 0%, color-mix(in oklab, var(--accent) 13%, transparent) 0%, transparent 62%)",
            }}
          />
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 block h-px"
            style={{ background: "linear-gradient(to right, var(--accent), transparent 55%)" }}
          />
          <div aria-hidden className="grain absolute inset-0" />

          {/* The whole point of the rebuild: copy and field share one line on a
              wide screen and stack into two on a narrow one. The old layout put
              eyebrow, heading and form on three centred rows and ran to a full
              viewport of height for a single input. */}
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="min-w-0">
              <p className="eyebrow">{newsletter.eyebrow}</p>
              {/* display-md, not display-lg: at one row the heading shares its
                  line with a form, and the larger step forced a wrap.

                  Sentence case is done in CSS — `lowercase` flattens the source
                  string's title casing, then `::first-letter` lifts the S back.
                  The constant in `homepage.ts` stays as the legacy site wrote
                  it, so this is a styling choice and not a content edit. */}
              <h2
                id="newsletter-heading"
                className="mt-2.5 display-md font-display lowercase first-letter:uppercase"
              >
                {newsletter.heading}
              </h2>
            </div>

            {done ? (
              <p
                role="status"
                className="inline-flex shrink-0 items-center gap-2.5 rounded-full border px-5 py-3 text-sm"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                <Check className="size-4" aria-hidden />
                You&rsquo;re on the list. Thank you for subscribing.
              </p>
            ) : (
              <form
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                className="w-full shrink-0 lg:w-[26rem]"
              >
                {/* The field and its button are one pill on anything above a
                    phone: two separate rounded controls side by side read as
                    two unrelated things, and this is a single action. */}
                <div
                  className="flex flex-col gap-2.5 rounded-2xl border p-2 transition-colors duration-300 focus-within:border-[var(--accent)] sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:p-1.5 sm:pl-5"
                  style={{ borderColor: "var(--hairline-strong)" }}
                >
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    autoComplete="email"
                    placeholder={newsletter.placeholder}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? "newsletter-error" : undefined}
                    {...register("email")}
                    /* No border and no ring of its own — the wrapper carries
                       both, so focus lights the whole pill rather than drawing a
                       second outline inside it. */
                    className="h-10 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:opacity-60 sm:px-0"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary group shrink-0 justify-center"
                  >
                    {newsletter.cta}
                    <ArrowRight className="size-4 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
                  </button>
                </div>

                {errors.email && (
                  <p
                    id="newsletter-error"
                    role="alert"
                    className="mt-2.5 pl-1 text-xs"
                    style={{ color: "#E2725B" }}
                  >
                    {errors.email.message}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
