/* Answers the only question that matters about a scroll-driven counter: did the
   visitor actually SEE it count? A trigger that fires while the numbers are still
   below the fold passes every "does it animate" test and still looks static,
   because the 1.9s of counting is spent off-screen.

   Scrolls the page the way a person does — in small steps, at a measured rate —
   and samples each digit's value together with its position, then reports how much
   of each count happened while that digit was on screen.
   Usage: node .qa/factsscroll.mjs [pxPerSecond] */
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const SPEED = Number(process.argv[2] || 1200); // px/s — a brisk wheel scroll
const url = "http://127.0.0.1:3100/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9389", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-scroll`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9389/json/list")).json();
    target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  } catch {}
}
const sock = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
let seq = 0; const pending = new Map();
sock.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const cmd = (m, params = {}) => new Promise((res) => {
  const id = ++seq; pending.set(id, res); sock.send(JSON.stringify({ id, method: m, params }));
});
const ev = async (expression) => {
  const { result } = await cmd("Runtime.evaluate", { expression, returnByValue: true });
  if (result?.exceptionDetails) {
    throw new Error(`page-side: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
  }
  return result?.result?.value;
};

await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await cmd("Page.navigate", { url });
for (let i = 0; i < 60; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(4200);

const SECTION = `document.querySelector('[aria-labelledby="facts-heading"]')`;
/* Position is read off the number itself, not off its card: the card top clears
   the fold roughly 110px before the digit does, and 110px is most of the window
   in which this either works or does not. */
const SAMPLE = `(()=>{const vh=innerHeight;
  return [...${SECTION}.querySelectorAll("[data-fact]")].map(c=>{
    const dt=c.querySelector("dt").textContent.trim();
    const dd=c.querySelector("dd"); const r=dd.getBoundingClientRect();
    return {label:dt, v:dd.textContent.trim(),
      /* "Seen" means fully inside the viewport, not merely intersecting it — a
         digit half-cut by the bottom edge is not something anyone read. */
      seen: r.top>=0 && r.bottom<=vh};});})()`;

const top = await ev(`${SECTION}.getBoundingClientRect().top + scrollY`);
const START = Math.round(top - 1500);
/* The crawl parks where the digits are still comfortably in view, derived from
   the digit's own document offset rather than guessed as an offset from the
   section top. A flat "+700" scrolled the numbers 285px ABOVE the viewport, so
   every sample in the settle tail below scored "not seen" and the counter was
   failed for the probe's park point instead of its own trigger. */
const ddDocTop = await ev(
  `${SECTION}.querySelector("[data-fact] dd").getBoundingClientRect().top + scrollY`,
);
const END = Math.round(ddDocTop - (await ev("innerHeight")) * 0.45);
await ev(`scrollTo({top:${START},behavior:"instant"})`);
await sleep(800);

const STEP_MS = 32;
const stepPx = Math.max(1, Math.round((SPEED * STEP_MS) / 1000));
const trace = new Map(); // label -> [{v, seen}]

for (let y = START; y <= END; y += stepPx) {
  await ev(`scrollTo({top:${y},behavior:"instant"})`);
  for (const s of await ev(SAMPLE)) {
    if (!trace.has(s.label)) trace.set(s.label, []);
    trace.get(s.label).push({ v: Number(s.v), seen: s.seen });
  }
  await sleep(STEP_MS);
}
/* The scroll stops at the section, but the tween does not — without this tail the
   probe clips the last ~1s of every count and blames the trigger for it. */
for (let i = 0; i < 40; i++) {
  for (const s of await ev(SAMPLE)) trace.get(s.label).push({ v: Number(s.v), seen: s.seen });
  await sleep(60);
}

console.log(`\nscrolled ${START} → ${END} at ~${SPEED}px/s (${stepPx}px per ${STEP_MS}ms)\n`);
let failed = 0;
for (const [label, series] of trace) {
  const lo = series[0].v;
  const hi = series[series.length - 1].v;
  const span = hi - lo;
  if (span === 0) { console.log(`  ${label.padEnd(12)} inert (${hi}) — expected for a year`); continue; }

  /* The share of the numeric journey that advanced while the digit was on screen.
     A count that ran entirely below the fold scores 0 and reads as static, however
     correct its endpoints are. */
  let visibleGain = 0;
  for (let i = 1; i < series.length; i++) {
    const d = series[i].v - series[i - 1].v;
    if (d > 0 && series[i].seen) visibleGain += d;
  }
  const pct = Math.round((visibleGain / span) * 100);
  const firstSeen = series.find((s) => s.seen);
  const atFirstSeen = firstSeen ? firstSeen.v : hi;
  const ok = pct >= 60;
  if (!ok) failed++;
  console.log(
    `  ${label.padEnd(12)} ${lo}→${hi}  counted-while-visible ${String(pct).padStart(3)}%` +
    `  reads ${String(atFirstSeen).padStart(4)} when first fully on screen  ${ok ? "PASS" : "FAIL"}`,
  );
}
console.log(failed
  ? `\n${failed} counter(s) largely finish off-screen — the trigger fires too early`
  : "\nevery counter does the bulk of its counting in view");
sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
