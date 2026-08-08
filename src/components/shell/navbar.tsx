"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand, navLinks, site } from "@/content/site";
import { MobileNav } from "@/components/shell/mobile-nav";

export function Navbar() {
  const [lifted, setLifted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[110] transition-[background-color,border-color,backdrop-filter] duration-500",
          lifted ? "border-b backdrop-blur-xl" : "border-b border-transparent",
        )}
        style={{
          backgroundColor: lifted ? "var(--surface-blur)" : "transparent",
          borderColor: lifted ? "var(--hairline)" : "transparent",
        }}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between gap-6 px-5 sm:px-8 lg:h-20"
        >
          <Link href="/" className="shrink-0" aria-label={`${site.name} — home`}>
            <Image
              src={brand.logo}
              alt={site.name}
              width={617}
              height={550}
              priority
              sizes="72px"
              className="h-12 w-auto lg:h-14"
            />
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {navLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="nav-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* The light-theme toggle sat here. Taken out at the client's
                request while the light palette is still being settled — the
                provider and every `light:` rule are untouched, so putting the
                button back is a one-block change. */}
            <Link href="/contact-us" className="btn-primary hidden lg:inline-flex">
              Start a project
            </Link>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="icon-button lg:hidden"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </nav>
      </header>

      <MobileNav open={open} onClose={() => setOpen(false)} />
    </>
  );
}
