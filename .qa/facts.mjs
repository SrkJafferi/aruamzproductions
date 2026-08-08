/* Proves the Company Facts counters actually run: that they sit at zero before
   the section is reached, tick upward once it is, land exactly on the figures in
   the content, and that the founding year — a label, not a quantity — never
   counts. Usage: node .qa/facts.mjs */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const url = process.argv[2] || "http://127.0.0.1:3100/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Straight from src/content/homepage.ts. Hard-coded rather than imported so the
   probe fails if the render and the content ever drift apart — an import would
   just move in step with the bug. */
const EXPECTED = { Established: "2017", Employees: "5", Clients: "23", Projects: "37" };
const PLAIN = "Established";

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9371", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-facts`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9371/json/list")).json();
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
// Headless defaults to `reduce`, and this component deliberately skips every
// tween under that setting — without the override the probe would measure the
// static fallback and call it a pass.
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await cmd("Page.navigate", { url });
for (let i = 0; i < 60; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(4200); // loader curtain + hero handshake

const SECTION = `document.querySelector('[aria-labelledby="facts-heading"]')`;
/* Reads the card's own label so a sample is keyed by meaning, not by DOM order —
   reordering the grid must not silently re-point the assertions. */
const READ = `(()=>Object.fromEntries([...${SECTION}.querySelectorAll("[data-fact]")]
  .map(c=>[c.querySelector("dt").textContent.trim(), c.querySelector("dd").textContent.trim()])))()`;

const top = await ev(`${SECTION}.getBoundingClientRect().top + scrollY`);

/* Parked a full viewport clear of the trigger (start: "top 82%"), not merely
   above the section: ScrollTrigger fires on the band entering the lower fifth of
   the window, so stopping just short of the section top would already have run
   it and the "before" reading would be the finished numbers. */
await ev(`scrollTo({top:${Math.round(top - 1400)},behavior:"instant"})`);
await sleep(700);
const before = await ev(READ);
console.log("before the trigger:", JSON.stringify(before));

for (const [label, want] of Object.entries(EXPECTED)) {
  const got = before[label];
  if (label === PLAIN) {
    if (got !== want) throw new Error(`"${label}" should read ${want} at rest, read ${got}`);
  } else if (got !== "0") {
    throw new Error(`"${label}" should be zeroed before the trigger, read ${got}`);
  }
}

// Into view, then sampled densely enough to catch the ease rather than just its
// endpoints.
await ev(`scrollTo({top:${Math.round(top - 220)},behavior:"instant"})`);
const samples = [];
for (let i = 0; i < 26; i++) {
  samples.push({ t: i * 140, v: await ev(READ) });
  if (i === 6) {
    writeFileSync(
      `${OUT}\\facts-midcount.png`,
      Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).result.data, "base64"),
    );
  }
  await sleep(140);
}

let failed = 0;
console.log("\nper-card trace\n");
for (const label of Object.keys(EXPECTED)) {
  const series = samples.map((s) => Number(s.v[label]));
  const distinct = new Set(series).size;
  const monotonic = series.every((n, i) => i === 0 || n >= series[i - 1]);
  const settled = String(series[series.length - 1]);

  const okEnd = settled === EXPECTED[label];
  // The year is asserted to be inert; the rest are asserted to have moved. A
  // counter that jumps 0 -> final in one frame passes "ends correct" but is not
  // an animation, so distinctness is checked separately.
  const okMotion = label === PLAIN ? distinct === 1 : distinct >= 5;
  if (!okEnd || !okMotion || !monotonic) failed++;

  console.log(
    `  ${label.padEnd(12)} settles ${settled.padStart(4)} (want ${EXPECTED[label].padStart(4)})` +
    `  steps=${String(distinct).padStart(2)}  monotonic=${monotonic}` +
    `  ${okEnd && okMotion && monotonic ? "PASS" : "FAIL"}`,
  );
  console.log(`    ${series.slice(0, 16).join(" → ")}`);
}

writeFileSync(
  `${OUT}\\facts-settled.png`,
  Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).result.data, "base64"),
);

/* The bars are tweened off the same timeline, so a stuck bar means a stuck
   timeline even when the digits happen to look right. */
const bars = await ev(
  `[...${SECTION}.querySelectorAll("[data-fact-bar]")].map(b=>getComputedStyle(b).transform)`,
);
const barsDrawn = bars.every((t) => t === "none" || /matrix\(1[,.]/.test(t));
console.log(`\n  bars settled at full width: ${barsDrawn ? "PASS" : `FAIL — ${bars.join(" | ")}`}`);
if (!barsDrawn) failed++;

console.log(failed ? `\n${failed} check(s) failed` : "\nall counter checks pass");
sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
