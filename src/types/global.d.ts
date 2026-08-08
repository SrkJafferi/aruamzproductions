import type Lenis from "lenis";

declare global {
  interface Window {
    /** Set by <SmoothScroll /> so anchor links can hand off to Lenis. */
    __lenis?: Lenis;
  }
}

export {};
