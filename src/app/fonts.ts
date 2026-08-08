import { Oswald, Raleway } from "next/font/google";

/**
 * The pairing the live WordPress site already uses: condensed Oswald for
 * headings, Raleway for everything else. Keeping it means the rebuild reads as
 * the same brand rather than a redesign the client never asked for.
 */
export const oswald = Oswald({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
  preload: true,
  fallback: ["Oswald", "Impact", "sans-serif"],
});

/**
 * Carries body copy, sub-headings and the tracked-out label voice. Italic is
 * loaded for the pull-quotes — Oswald ships no italic, so the quotes moved
 * here rather than letting the browser synthesise a slanted condensed face.
 */
export const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-raleway",
  display: "swap",
  preload: true,
  fallback: ["Raleway", "Helvetica Neue", "sans-serif"],
});

export const fontVariables = [oswald.variable, raleway.variable].join(" ");
