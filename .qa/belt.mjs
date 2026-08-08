/* Grades the logo belt and the newsletter band: that the belt loops without a
   seam or a scrollbar, slows under the pointer, falls back to a static wrapped
   row under reduced motion, and that the newsletter fits the one-or-two rows it
   was cut down to.
   Usage: node .qa/belt.mjs */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9403", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-belt`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9403/json/list")).json();
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
  const { result } = await cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result?.exceptionDetails) {
    throw new Error(`page-side: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
  }
  return result?.result?.value;
};

let failed = 0;
const fail = (msg) => { failed++; console.log(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  PASS  ${msg}`);

// Read from the content file, not guessed: the band is labelled by aria-label
// rather than a heading id, so a wrong string here fails as "the section does
// not exist" and reads like a regression in the component.
const BELT = `document.querySelector('[aria-label="Clients of Aruamz Productions"]')`;
const NEWS = `document.querySelector('[aria-labelledby="newsletter-heading"]')`;

const boot = async (motion) => {
  await cmd("Page.enable");
  await cmd("Runtime.enable");
  await cmd("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: motion }],
  });
  await cmd("Page.navigate", { url: "http://127.0.0.1:3100/" });
  for (let i = 0; i < 60; i++) {
    if ((await ev("document.readyState")) === "complete") break;
    await sleep(300);
  }
  await sleep(4200);
};

const park = async (sel) => {
  const g = await ev(`(()=>{const r=${sel}.getBoundingClientRect();
    return {top:Math.round(r.top+scrollY),h:Math.round(r.height),vh:innerHeight,vw:innerWidth};})()`);
  await ev(`scrollTo({top:${Math.round(g.top - Math.max(0, (g.vh - g.h) / 2))},behavior:"instant"})`);
  await sleep(1200);
  return g;
};

/* ── 1. The belt ───────────────────────────────────────────────────────── */
await boot("no-preference");
console.log("\n── logo belt ──");
const bg = await park(BELT);

/* No scrollbar, in either direction. This is the reported complaint: the row
   used to become overflow-x-auto, and asking someone to drag a bar sideways is
   not a carousel. Checked on the scrolling box itself — a clientWidth short of
   scrollWidth with a non-visible overflow is exactly what puts a bar there. */
const bars = await ev(`(()=>{const s=${BELT};
  return [...s.querySelectorAll("*")].filter(el=>{
    const cs=getComputedStyle(el);
    return /auto|scroll/.test(cs.overflowX) && el.scrollWidth>el.clientWidth+1;
  }).map(el=>el.className.toString().slice(0,50));})()`);
bars.length === 0 ? pass("nothing scrolls horizontally") : fail(`scrollable: ${bars.join(" | ")}`);

// Two tracks of identical width is what makes the −100% loop seamless. If they
// ever differ the belt jumps at the wrap.
const tracks = await ev(`(()=>{const t=[...${BELT}.querySelectorAll("[data-track]")];
  return {n:t.length, widths:t.map(x=>Math.round(x.getBoundingClientRect().width)),
    items:t.map(x=>x.children.length)};})()`);
tracks.n === 2 ? pass("two tracks") : fail(`${tracks.n} tracks — the loop needs exactly 2`);
tracks.widths[0] === tracks.widths[1]
  ? pass(`tracks match at ${tracks.widths[0]}px (${tracks.items[0]} logos each)`)
  : fail(`tracks differ: ${tracks.widths.join(" vs ")}px — the loop will jump`);

/* The belt must actually travel, and travel evenly. Sampled as translate x, so
   a belt that is animating some other property and merely looks alive fails. */
const readX = `(()=>{const t=${BELT}.querySelector("[data-track]");
  return new DOMMatrixReadOnly(getComputedStyle(t).transform).m41;})()`;
const x0 = await ev(readX);
await sleep(1500);
const x1 = await ev(readX);
await sleep(1500);
const x2 = await ev(readX);
const d1 = x0 - x1, d2 = x1 - x2;
d1 > 4 && d2 > 4
  ? pass(`travels left: ${d1.toFixed(1)}px then ${d2.toFixed(1)}px per 1.5s`)
  : fail(`did not travel: ${d1.toFixed(1)}px then ${d2.toFixed(1)}px`);
// Linear, so the belt does not visibly surge and slack on its own.
Math.abs(d1 - d2) < Math.max(d1, d2) * 0.25
  ? pass("travels at an even rate")
  : fail(`rate is uneven: ${d1.toFixed(1)} vs ${d2.toFixed(1)}`);

/* Hover eases it to a stop rather than freezing on the frame the pointer
   arrived on. Both halves are asserted: that it stops, and that it recovers —
   a belt that stops and stays stopped is worse than one that never paused. */
const box = await ev(`(()=>{const r=${BELT}.querySelector("[data-track]").getBoundingClientRect();
  return {x:Math.round(r.left+r.width/4),y:Math.round(r.top+r.height/2)};})()`);
await cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
await sleep(1100);
const h0 = await ev(readX);
await sleep(1200);
const h1 = await ev(readX);
Math.abs(h0 - h1) < 2
  ? pass(`held still under the pointer (${Math.abs(h0 - h1).toFixed(2)}px in 1.2s)`)
  : fail(`still moving under the pointer: ${Math.abs(h0 - h1).toFixed(1)}px in 1.2s`);

await cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
await sleep(1100);
const r0 = await ev(readX);
await sleep(1200);
const r1 = await ev(readX);
r0 - r1 > 4 ? pass(`resumes on leave (${(r0 - r1).toFixed(1)}px in 1.2s)`) : fail(`did not resume: ${(r0 - r1).toFixed(1)}px`);

writeFileSync(`${OUT}\\belt-dark.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).result.data, "base64"));

/* ── 2. Newsletter height ──────────────────────────────────────────────── */
console.log("\n── newsletter ──");
for (const theme of ["dark", "light"]) {
  await ev(`document.documentElement.setAttribute("data-theme","${theme}")`);
  await sleep(500);
  const ng = await park(NEWS);
  if (theme === "dark") {
    /* The ask was one or two rows. Measured as a share of the viewport rather
       than in pixels: "short" means it does not read as another floor of the
       page, and that is a proportion, not a number. */
    const share = ng.h / ng.vh;
    share < 0.42
      ? pass(`band is ${ng.h}px, ${(share * 100).toFixed(0)}% of the viewport`)
      : fail(`band is ${ng.h}px, ${(share * 100).toFixed(0)}% of the viewport — still a screenful`);

    // Copy and field on one line at desktop width is the whole point of the cut.
    const rows = await ev(`(()=>{const s=${NEWS};
      const h=s.querySelector("#newsletter-heading").getBoundingClientRect();
      const f=s.querySelector("form").getBoundingClientRect();
      return {sameRow: f.left>h.right-2, headH:Math.round(h.height), formH:Math.round(f.height)};})()`);
    rows.sameRow
      ? pass("heading and form share a row at desktop width")
      : fail("the form still sits below the heading at desktop width");
  }
  writeFileSync(`${OUT}\\newsletter-${theme}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
}

/* Validation still has to work after the relayout — the error is now inside a
   pill whose border is the focus ring, which is the easiest thing to break. */
await ev(`document.documentElement.setAttribute("data-theme","dark")`);
await park(NEWS);
await ev(`(()=>{const i=${NEWS}.querySelector("#newsletter-email");
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;
  set.call(i,"not-an-email"); i.dispatchEvent(new Event("input",{bubbles:true}));})()`);
await ev(`${NEWS}.querySelector("form").requestSubmit()`);
await sleep(900);
const err = await ev(`(()=>{const e=${NEWS}.querySelector("#newsletter-error");
  return e?{text:e.textContent.trim(),role:e.getAttribute("role"),
    described:${NEWS}.querySelector("#newsletter-email").getAttribute("aria-describedby")}:null;})()`);
err && err.role === "alert" && err.described === "newsletter-error"
  ? pass(`a bad address is rejected and announced: "${err.text}"`)
  : fail(`validation did not announce: ${JSON.stringify(err)}`);

/* ── 3. Reduced motion ─────────────────────────────────────────────────── */
console.log("\n── reduced motion ──");
await boot("reduce");
await park(BELT);
const rm = await ev(`(()=>{const s=${BELT};
  const belt=s.querySelector("[data-track]")?.closest("div");
  const statics=[...s.querySelectorAll("li")].filter(li=>li.offsetParent!==null);
  const bars=[...s.querySelectorAll("*")].filter(el=>{
    const cs=getComputedStyle(el);
    return /auto|scroll/.test(cs.overflowX) && el.scrollWidth>el.clientWidth+1;});
  return {beltHidden: !belt || belt.offsetParent===null,
    visibleLogos: statics.length, scrollers: bars.length};})()`);
rm.beltHidden ? pass("the moving belt is not rendered") : fail("the belt still runs under reduce");
rm.scrollers === 0 ? pass("no horizontal scrollbar") : fail(`${rm.scrollers} scrollable box(es) under reduce`);
rm.visibleLogos === 12
  ? pass("all 12 logos shown at once")
  : fail(`${rm.visibleLogos} logos visible — expected all 12 wrapped`);

writeFileSync(`${OUT}\\belt-reduce.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).result.data, "base64"));

console.log(failed ? `\n${failed} check(s) failed` : "\nall belt + newsletter checks pass");
sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
