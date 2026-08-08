"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronDown, Mail, MapPin, Phone, Send } from "lucide-react";
import { contactForm, contactOffice } from "@/content/contact";
import { contact as office, site, socials } from "@/content/site";
import { socialIcons, WhatsAppIcon } from "@/components/icons/social";
import { useReveal } from "@/hooks/use-reveal";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.email("Please enter a valid e-mail address"),
  /* The legacy form had no phone field at all, so this one cannot be required —
     it is offered because a production enquiry usually ends in a phone call. */
  phone: z.string().trim().optional(),
  subject: z.string().trim().min(1, "Please choose what this is about"),
  message: z.string().trim().min(10, "Please add a little more detail"),
});

type Values = z.infer<typeof schema>;

/** Icons for the Our Office rows, keyed by the `icon` string in the content. */
const ROW_ICONS = {
  "map-pin": MapPin,
  mail: Mail,
  phone: Phone,
  whatsapp: WhatsAppIcon,
} as const;

/**
 * One plain-text block, sent down whichever channel the visitor picks. Keeping
 * a single composer means WhatsApp and e-mail can never carry different
 * versions of the same enquiry.
 */
function compose(values: Values) {
  const lines = [
    `Name: ${values.name}`,
    `E-mail: ${values.email}`,
    values.phone ? `Phone: ${values.phone}` : null,
    `Subject: ${values.subject}`,
    "",
    values.message,
  ].filter(Boolean);
  return `Hello ${site.name}!\n\n${lines.join("\n")}`;
}

export function ContactMain() {
  const scope = useReveal<HTMLElement>({ y: 26, stagger: 0.07 });
  const [sent, setSent] = useState<null | "whatsapp" | "email">(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: { subject: contactForm.subjects[0] },
  });

  /* There is no backend on this site and no mail service is configured, so the
     form hands the message to a channel the client already runs rather than
     posting it into a void. Nothing typed here is ever lost. */
  const openWhatsApp = (values: Values) => {
    const url = `https://wa.me/${office.whatsapp}?text=${encodeURIComponent(compose(values))}`;
    /* Popup blockers occasionally refuse the new tab because validation put a
       microtask between the click and the open — fall back to navigating. */
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = url;
    setSent("whatsapp");
  };

  const openEmail = (values: Values) => {
    const subject = encodeURIComponent(`Website enquiry — ${values.subject}`);
    const body = encodeURIComponent(compose(values));
    window.location.href = `mailto:${office.email}?subject=${subject}&body=${body}`;
    setSent("email");
  };

  const fieldWrap =
    "group/field relative mt-2 overflow-hidden rounded-xl border transition-colors duration-300 focus-within:border-[var(--accent)]";
  const fieldStyle = {
    borderColor: "var(--hairline-strong)",
    backgroundColor: "var(--bg)",
  } as const;
  const labelClass =
    "block font-mono text-[0.625rem] font-semibold tracking-[0.2em] uppercase";
  const errorClass = "mt-2 text-xs";

  return (
    <section
      ref={scope}
      id="contact-form"
      aria-labelledby="contact-form-heading"
      className="relative scroll-mt-24 py-20 sm:py-28 lg:py-32"
      style={{ backgroundColor: "var(--bg-elevated)" }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 block h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 55%, transparent) 30%, color-mix(in srgb, var(--accent) 55%, transparent) 70%, transparent)",
        }}
      />

      <div className="container-page">
        {/* The legacy page's own two columns, in its own order: the form on the
            left, "Our Office" on the right. Only the treatment changes. */}
        <div className="grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14 xl:gap-20">
          {/* ── the form ───────────────────────────────────────────────── */}
          <div
            className="reveal relative overflow-hidden rounded-2xl p-6 sm:rounded-3xl sm:p-9 lg:p-10"
            style={{ backgroundColor: "var(--bg)", border: "1px solid var(--hairline-strong)" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(85% 120% at 6% 0%, color-mix(in oklab, var(--accent) 12%, transparent) 0%, transparent 58%)",
              }}
            />
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 block h-px"
              style={{ background: "linear-gradient(to right, var(--accent), transparent 55%)" }}
            />
            <div aria-hidden className="grain absolute inset-0" />

            <div className="relative">
              <p className="eyebrow">{contactForm.eyebrow}</p>
              <h2 id="contact-form-heading" className="mt-3 display-md font-display">
                {contactForm.heading}
              </h2>
              <p
                className="mt-4 max-w-prose text-sm leading-relaxed sm:text-base"
                style={{ color: "var(--fg-muted)" }}
              >
                {contactForm.intro}
              </p>

              <form
                noValidate
                onSubmit={handleSubmit(openWhatsApp)}
                className="mt-8 flex flex-col gap-5"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className={labelClass}>
                      {contactForm.fields.name.label}
                    </label>
                    <div className={fieldWrap} style={fieldStyle}>
                      <input
                        id="contact-name"
                        autoComplete="name"
                        placeholder={contactForm.fields.name.placeholder}
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={errors.name ? "contact-name-error" : undefined}
                        {...register("name")}
                        className="h-12 w-full bg-transparent px-4 text-sm outline-none placeholder:opacity-45"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-700 ease-[var(--ease-out-quint)] group-focus-within/field:scale-x-100"
                        style={{
                          background: "linear-gradient(to right, var(--accent), transparent)",
                        }}
                      />
                    </div>
                    {errors.name && (
                      <p
                        id="contact-name-error"
                        role="alert"
                        className={errorClass}
                        style={{ color: "#E2725B" }}
                      >
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact-email" className={labelClass}>
                      {contactForm.fields.email.label}
                    </label>
                    <div className={fieldWrap} style={fieldStyle}>
                      <input
                        id="contact-email"
                        type="email"
                        autoComplete="email"
                        placeholder={contactForm.fields.email.placeholder}
                        aria-invalid={errors.email ? true : undefined}
                        aria-describedby={errors.email ? "contact-email-error" : undefined}
                        {...register("email")}
                        className="h-12 w-full bg-transparent px-4 text-sm outline-none placeholder:opacity-45"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-700 ease-[var(--ease-out-quint)] group-focus-within/field:scale-x-100"
                        style={{
                          background: "linear-gradient(to right, var(--accent), transparent)",
                        }}
                      />
                    </div>
                    {errors.email && (
                      <p
                        id="contact-email-error"
                        role="alert"
                        className={errorClass}
                        style={{ color: "#E2725B" }}
                      >
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className={labelClass}>
                      {contactForm.fields.phone.label}{" "}
                      <span className="tracking-normal opacity-55">(optional)</span>
                    </label>
                    <div className={fieldWrap} style={fieldStyle}>
                      <input
                        id="contact-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder={contactForm.fields.phone.placeholder}
                        {...register("phone")}
                        className="h-12 w-full bg-transparent px-4 text-sm outline-none placeholder:opacity-45"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-700 ease-[var(--ease-out-quint)] group-focus-within/field:scale-x-100"
                        style={{
                          background: "linear-gradient(to right, var(--accent), transparent)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className={labelClass}>
                      {contactForm.fields.subject.label}
                    </label>
                    {/* The options are the six services the client publishes, so
                        an enquiry arrives already routed. */}
                    <div className={fieldWrap} style={fieldStyle}>
                      <select
                        id="contact-subject"
                        aria-invalid={errors.subject ? true : undefined}
                        {...register("subject")}
                        className="h-12 w-full appearance-none bg-transparent px-4 pr-11 text-sm outline-none"
                      >
                        {contactForm.subjects.map((subject) => (
                          <option
                            key={subject}
                            value={subject}
                            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--fg)" }}
                          >
                            {subject}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
                        style={{ color: "var(--fg-muted)" }}
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-700 ease-[var(--ease-out-quint)] group-focus-within/field:scale-x-100"
                        style={{
                          background: "linear-gradient(to right, var(--accent), transparent)",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className={labelClass}>
                    {contactForm.fields.message.label}
                  </label>
                  <div className={fieldWrap} style={fieldStyle}>
                    <textarea
                      id="contact-message"
                      rows={5}
                      placeholder={contactForm.fields.message.placeholder}
                      aria-invalid={errors.message ? true : undefined}
                      aria-describedby={errors.message ? "contact-message-error" : undefined}
                      {...register("message")}
                      className="w-full resize-y bg-transparent px-4 py-3.5 text-sm leading-relaxed outline-none placeholder:opacity-45"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-700 ease-[var(--ease-out-quint)] group-focus-within/field:scale-x-100"
                      style={{
                        background: "linear-gradient(to right, var(--accent), transparent)",
                      }}
                    />
                  </div>
                  {errors.message && (
                    <p
                      id="contact-message-error"
                      role="alert"
                      className={errorClass}
                      style={{ color: "#E2725B" }}
                    >
                      {errors.message.message}
                    </p>
                  )}
                </div>

                {/* Both channels stay on screen after a send, so a visitor who
                    picked the wrong one can hand the same message to the other
                    without typing it twice. */}
                <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary group justify-center"
                  >
                    <WhatsAppIcon className="size-4" />
                    {contactForm.submit}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit(openEmail)}
                    className="btn-ghost group justify-center"
                  >
                    <Send className="size-4 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    {contactForm.alternate}
                  </button>
                </div>

                {sent && (
                  <p
                    role="status"
                    className="inline-flex items-center gap-2.5 self-start rounded-full border px-5 py-3 text-sm"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                  >
                    <Check className="size-4 shrink-0" aria-hidden />
                    {contactForm.success}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* ── Our Office ─────────────────────────────────────────────── */}
          {/* Sticks beside the form on a wide screen: the address is what a
              visitor cross-checks while typing, so it should not scroll away. */}
          <aside
            aria-labelledby="contact-office-heading"
            className="reveal lg:sticky lg:top-28 lg:self-start"
          >
            <h2 id="contact-office-heading" className="display-md font-display">
              {contactOffice.heading}
            </h2>
            <p className="mt-5 text-lg leading-snug sm:text-xl">{contactOffice.street}</p>
            <p className="mt-1 text-lg leading-snug sm:text-xl" style={{ color: "var(--accent)" }}>
              {contactOffice.city}
            </p>

            <ul className="mt-9 flex flex-col">
              {contactOffice.rows.map((row) => {
                const Icon = ROW_ICONS[row.icon as keyof typeof ROW_ICONS];
                return (
                  <li key={row.key}>
                    <a
                      href={row.href}
                      {...(row.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="group flex items-start gap-4 border-b py-4 transition-colors duration-500"
                      style={{ borderColor: "var(--hairline)" }}
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ease-[var(--ease-out-quint)] group-hover:scale-105 group-hover:border-[var(--accent)]"
                        style={{
                          borderColor: "var(--hairline-strong)",
                          color: "var(--accent)",
                        }}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`${labelClass}`}
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {row.label}
                        </span>
                        <span className="mt-1.5 block text-sm leading-relaxed transition-colors duration-500 group-hover:text-[var(--accent)] sm:text-base">
                          {row.value}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 flex items-center gap-4">
              <span className={labelClass} style={{ color: "var(--fg-muted)" }}>
                {contactOffice.socialsLabel}
              </span>
              <span
                aria-hidden
                className="h-px w-8"
                style={{ backgroundColor: "var(--hairline-strong)" }}
              />
              <ul className="flex items-center gap-2.5">
                {socials.map((social) => {
                  const Icon = socialIcons[social.label];
                  return (
                    <li key={social.label}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                        className="icon-button"
                      >
                        {Icon ? <Icon className="size-4" /> : social.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
