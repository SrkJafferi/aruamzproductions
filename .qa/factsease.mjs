/* Why a counter can be correct, on-screen, and still read as static: the ease.
   `power3.out` spends ~87% of its numeric distance in the first half of its
   duration, so if the card is still fading in during that half, the visitor's
   first legible frame already shows a nearly-final figure and the rest is a twitch.

   Samples value AND opacity on the same frame, so the two can be lined up.
   Usage: node .qa/factsease.mjs */
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const url = "http://127.0.0.1:3100/";
/* `node .qa/factsease.mjs reduce` reproduces the report that started this: with the
   OS animation setting off, every counter is inert and shows its final figure at
   once. That is the intended fallback, not a defect — but it is indistinguishable
   from a broken counter unless you know to look, so it stays one argument away. */
const MOTION = process.argv[2] === "reduce" ? "reduce" : "no-preference";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9391", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-ease`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9391/json/list")).json();
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
  features: [{ name: "prefers-reduced-motion", value: MOTION }],
});
await cmd("Page.navigate", { url });
for (let i = 0; i < 60; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(4200);

const SECTION = `document.querySelector('[aria-labelledby="facts-heading"]')`;
const SAMPLE = `(()=>[...${SECTION}.querySelectorAll("[data-fact]")].map(c=>({
  label:c.querySelector("dt").textContent.trim(),
  v:Number(c.querySelector("dd").textContent.trim()),
  /* The card is what fades, so opacity is read there — the digit inherits it and
     reports 1 of its own regardless. */
  o:Number(getComputedStyle(c).opacity),
})))()`;

const top = await ev(`${SECTION}.getBoundingClientRect().top + scrollY`);
await ev(`scrollTo({top:${Math.round(top - 1500)},behavior:"instant"})`);
await sleep(700);

/* Glided in rather than teleported. A jump lands both ScrollTriggers — the
   section's reveal and the grid's counter — on the same frame, which is a timing
   relationship no visitor ever produces: scrolling normally, the section clears
   its threshold well before the grid clears its own. Teleporting therefore
   flatters or maligns the design depending on nothing but the parked offset. */
const SPEED = 1200, STEP_MS = 32;
const stepPx = Math.round((SPEED * STEP_MS) / 1000);
const series = new Map();
const t0 = Number(await ev("performance.now()"));
const record = async () => {
  const t = Number(await ev("performance.now()")) - t0;
  for (const s of await ev(SAMPLE)) {
    if (!series.has(s.label)) series.set(s.label, []);
    series.get(s.label).push({ t, v: s.v, o: s.o });
  }
};
for (let y = Math.round(top - 1500); y <= Math.round(top - 220); y += stepPx) {
  await ev(`scrollTo({top:${y},behavior:"instant"})`);
  await record();
  await sleep(STEP_MS);
}
// Held still afterwards: the scroll stops but the tweens do not, and clipping
// their tail would blame the ease for the probe's own impatience.
for (let i = 0; i < 55; i++) { await record(); await sleep(55); }

console.log("");
let failed = 0;
for (const [label, rows] of series) {
  const hi = rows[rows.length - 1].v;
  const lo = rows[0].v;
  if (hi === lo) { console.log(`  ${label.padEnd(12)} inert (${hi})`); continue; }

  /* The frame the card first becomes legible. 0.9 rather than 1.0: below that the
     copy is visibly washed out, and a number nobody can read has not been seen
     counting no matter what the DOM says. */
  const legible = rows.find((r) => r.o >= 0.9);
  const atLegible = legible ? legible.v : hi;
  const remaining = Math.round(((hi - atLegible) / (hi - lo)) * 100);

  // Where the numeric midpoint lands in time — a counter that hits half its value
  // in the first quarter of its run is front-loaded and reads as a snap.
  const half = rows.find((r) => r.v >= lo + (hi - lo) / 2);
  const done = rows.find((r) => r.v >= hi);

  const ok = MOTION === "reduce" ? true : remaining >= 50;
  if (!ok) failed++;
  console.log(
    `  ${label.padEnd(12)} ${lo}→${hi}` +
    `  legible@${String(Math.round(legible ? legible.t : 0)).padStart(4)}ms showing ${String(atLegible).padStart(4)}` +
    `  → ${String(remaining).padStart(3)}% of the count still to run  ${ok ? "PASS" : "FAIL"}`,
  );
  console.log(
    `    half at ${String(Math.round(half ? half.t : 0)).padStart(4)}ms,` +
    ` settled at ${String(Math.round(done ? done.t : 0)).padStart(4)}ms`,
  );
}
console.log(
  MOTION === "reduce"
    ? "\nreduced motion: every counter inert, showing its final figure — the intended fallback"
    : failed
      ? `\n${failed} counter(s) are mostly over before the card is legible`
      : "\nevery counter still has most of its run left when it becomes legible",
);
sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
