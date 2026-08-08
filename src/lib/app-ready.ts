/**
 * Handshake between the boot curtain and the hero.
 *
 * The hero's entrance is the first thing a visitor should see move, but the
 * loader covers the viewport for up to ~2.2s. Without this the reveal played
 * out behind the curtain and the hero appeared fully settled on first paint —
 * which reads as "no animation at all".
 */
const EVENT = "aruamz:ready";

export function markAppReady() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.ready = "true";
  window.dispatchEvent(new Event(EVENT));
}

export function isAppReady() {
  return typeof document !== "undefined" && document.documentElement.dataset.ready === "true";
}

/**
 * Runs `start` once the curtain is gone. `fallbackMs` is a safety net so the
 * hero still animates if the loader is unmounted before it can signal.
 */
export function onAppReady(start: () => void, fallbackMs = 2600) {
  if (typeof window === "undefined") return () => {};

  if (isAppReady()) {
    start();
    return () => {};
  }

  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    start();
  };

  const timer = window.setTimeout(run, fallbackMs);
  window.addEventListener(EVENT, run, { once: true });

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener(EVENT, run);
  };
}
