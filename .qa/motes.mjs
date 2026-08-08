/* Grades the gold particle field behind the quotes. Three questions, in order of
   how expensive the mistake is: did it break the pin, did it cost the quote its
   legibility, and does it actually move.
   Usage: node .qa/motes.mjs */
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9415", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-motes`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9415/json/list")).json();
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
const fail = (m) => { failed++; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  PASS  ${m}`);

const SECTION = `document.querySelector('[aria-labelledby="testimonials-heading"]')`;
const MOTES = `${SECTION}.querySelectorAll("[data-mote]")`;

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
  return ev(`(()=>{const r=${SECTION}.getBoundingClientRect();
    return {top:Math.round(r.top+scrollY),h:Math.round(r.height),vh:innerHeight};})()`);
};

/* ── 1. The pin still holds ────────────────────────────────────────────
   The layer is a sibling of the pinned container and carries overflow-hidden.
   If it were ever moved to wrap the container instead, GSAP's pin would fail
   silently — the band would simply scroll past and nothing would throw. */
const geo = await boot("no-preference");
console.log("\n── pin survives the new layer ──");
const tops = new Map();
let sawFixed = false;
for (let y = geo.top - geo.vh; y < geo.top + geo.h + geo.vh; y += 48) {
  await ev(`scrollTo({top:${y},behavior:"instant"})`);
  await sleep(26);
  /* Unrounded. Rounding here once reported a 1px "drift" that was only two
     fractional readings falling either side of a boundary — the pin was holding
     the whole time. The defect this guards against moved the heading 28px, so
     the tolerance below is nowhere near wide enough to hide it. */
  const r = await ev(`(()=>{const p=${SECTION}.querySelector(".container-page");
    return {fixed:getComputedStyle(p).position==="fixed",
      headTop:${SECTION}.querySelector("#testimonials-heading").getBoundingClientRect().top};})()`);
  if (!r.fixed) continue;
  sawFixed = true;
  tops.set(Math.round(r.headTop * 100) / 100, (tops.get(Math.round(r.headTop * 100) / 100) || 0) + 1);
}
sawFixed ? pass("the band still pins") : fail("the band no longer pins — an overflow ancestor would do this");
const seen = [...tops.keys()];
const swing = Math.max(...seen) - Math.min(...seen);
const n = [...tops.values()].reduce((a, b) => a + b, 0);
swing < 1.5
  ? pass(`heading held within ${swing.toFixed(2)}px across all ${n} pinned samples`)
  : fail(`heading drifted ${swing.toFixed(2)}px: ${[...tops.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t}px x${c}`).join(", ")}`);

/* ── 2. The motes stay behind the copy ─────────────────────────────────
   The whole risk of a particle field over an editorial band: a bright speck
   landing on a glyph. Two independent guards are asserted, because either alone
   can be undone by a later style change — the layer must be behind the content
   in paint order, and it must not take the pointer. */
console.log("\n── the field stays out of the way ──");
const layer = await ev(`(()=>{const l=${SECTION}.querySelector("[data-mote]").parentElement;
  const cs=getComputedStyle(l);
  const content=${SECTION}.querySelector(".container-page");
  return {pointer:cs.pointerEvents, overflow:cs.overflow,
    hidden:l.getAttribute("aria-hidden"),
    layerZ:cs.zIndex, contentZ:getComputedStyle(content).zIndex,
    count:${MOTES}.length};})()`);
layer.pointer === "none" ? pass("layer does not take the pointer") : fail(`pointer-events: ${layer.pointer}`);
layer.hidden === "true" ? pass("layer is aria-hidden") : fail("the motes are in the accessibility tree");
layer.overflow === "hidden" ? pass("motes are clipped to the band") : fail(`overflow: ${layer.overflow}`);
Number(layer.contentZ) > 0 && (layer.layerZ === "auto" || Number(layer.layerZ) < Number(layer.contentZ))
  ? pass(`content (z=${layer.contentZ}) paints above the field (z=${layer.layerZ})`)
  : fail(`paint order is wrong: field z=${layer.layerZ}, content z=${layer.contentZ}`);
layer.count === 26 ? pass("26 motes") : fail(`${layer.count} motes rendered`);

/* Elementary but decisive: ask the browser what is actually on top at a sample
   of points across the quote. A mote painting over the text would answer here
   and nowhere else. */
await ev(`scrollTo({top:${geo.top + 300},behavior:"instant"})`);
await sleep(1200);
const hits = await ev(`(()=>{const p=${SECTION}.querySelector("blockquote p");
  const r=p.getBoundingClientRect(); const bad=[];
  for(let i=1;i<=6;i++){ for(let j=1;j<=3;j++){
    const x=r.left+(r.width*i)/7, y=r.top+(r.height*j)/4;
    const el=document.elementFromPoint(x,y);
    if(el && el.hasAttribute && el.hasAttribute("data-mote")) bad.push([Math.round(x),Math.round(y)]);
  }}
  return bad;})()`);
hits.length === 0
  ? pass("nothing lands on top of the quote at 18 sample points")
  : fail(`a mote is over the quote at ${hits.length} point(s): ${JSON.stringify(hits.slice(0, 3))}`);

/* ── 3. It moves, and it moves gently ──────────────────────────────────
   A particle field that does not travel is just texture, and one that travels
   fast is a distraction next to text someone is reading. Both bounds asserted. */
console.log("\n── drift ──");
const readY = `[...${MOTES}].slice(0,8).map(m=>
  Math.round(new DOMMatrixReadOnly(getComputedStyle(m).transform).m42*10)/10)`;
const y0 = await ev(readY);
await sleep(2500);
const y1 = await ev(readY);
const moved = y0.filter((v, i) => Math.abs(v - y1[i]) > 0.5).length;
moved >= 6
  ? pass(`${moved} of 8 sampled motes drifted in 2.5s`)
  : fail(`only ${moved} of 8 motes moved — the field is static`);
const fastest = Math.max(...y0.map((v, i) => Math.abs(v - y1[i]))) / 2.5;
fastest < 60
  ? pass(`fastest mote travels ${fastest.toFixed(1)}px/s — ambient, not distracting`)
  : fail(`fastest mote travels ${fastest.toFixed(1)}px/s — too quick beside body copy`);

// Opacity has to breathe too, or the specks read as fixed dots.
const o0 = await ev(`[...${MOTES}].slice(0,10).map(m=>Math.round(getComputedStyle(m).opacity*1000)/1000)`);
await sleep(1800);
const o1 = await ev(`[...${MOTES}].slice(0,10).map(m=>Math.round(getComputedStyle(m).opacity*1000)/1000)`);
const twinkled = o0.filter((v, i) => Math.abs(v - o1[i]) > 0.005).length;
twinkled >= 5 ? pass(`${twinkled} of 10 motes twinkled`) : fail(`only ${twinkled} of 10 changed opacity`);

// Faint by construction. A gold speck at full strength beside a quote competes
// with it; the cap is what keeps the field atmospheric.
const peak = await ev(`Math.max(...[...${MOTES}].map(m=>Number(getComputedStyle(m).opacity)))`);
peak <= 0.6 ? pass(`peak mote opacity ${peak.toFixed(2)}`) : fail(`a mote reaches ${peak.toFixed(2)} opacity — too assertive`);

/* ── 4. Reduced motion ─────────────────────────────────────────────────
   The motes stay as texture; only the drift stops. Removing them entirely would
   cost the band its atmosphere for no accessibility gain. */
console.log("\n── reduced motion ──");
const gR = await boot("reduce");
await ev(`scrollTo({top:${gR.top + 300},behavior:"instant"})`);
await sleep(1200);
const rmCount = await ev(`${MOTES}.length`);
const r0 = await ev(readY);
await sleep(2500);
const r1 = await ev(readY);
const rmMoved = r0.filter((v, i) => Math.abs(v - r1[i]) > 0.5).length;
rmCount === 26 ? pass("motes still present as texture") : fail(`${rmCount} motes under reduce`);
rmMoved === 0 ? pass("no drift under reduce") : fail(`${rmMoved} motes still drifting despite reduce`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall particle checks pass");
sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
