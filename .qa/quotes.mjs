/* Grades the testimonials band: the pinned scroll sequence, contrast in both
   themes, the tablist contract, the narrow-screen timer fallback, and the
   reduced-motion fallback.
   Usage: node .qa/quotes.mjs */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9399", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-quotes`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9399/json/list")).json();
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
/* Throws on a page-side exception rather than returning undefined: a silent
   failure here reads as "the design is broken" instead of "the probe never
   ran", which is a far more expensive mistake to chase. */
const ev = async (expression) => {
  const { result } = await cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result?.exceptionDetails) {
    throw new Error(`page-side: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
  }
  return result?.result?.value;
};

const SECTION = `document.querySelector('[aria-labelledby="testimonials-heading"]')`;
const png = (b64) => Buffer.from(b64, "base64");
// pathToFileURL, not a bare path: the ESM loader rejects Windows drive letters.
const sharp = (await import(
  pathToFileURL("F:/xampp/htdocs/aruamzproductions/node_modules/sharp/lib/index.js").href
)).default;
const lum = (r, g, b) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); };

let failed = 0;
const fail = (msg) => { failed++; console.log(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  PASS  ${msg}`);

const boot = async (motion, metrics) => {
  await cmd("Page.enable");
  await cmd("Runtime.enable");
  await cmd("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: motion }],
  });
  if (metrics) await cmd("Emulation.setDeviceMetricsOverride", { ...metrics, deviceScaleFactor: 1, mobile: false });
  else await cmd("Emulation.clearDeviceMetricsOverride");
  await cmd("Page.navigate", { url: "http://127.0.0.1:3100/" });
  for (let i = 0; i < 60; i++) {
    if ((await ev("document.readyState")) === "complete") break;
    await sleep(300);
  }
  await sleep(4200);
  return ev(
    `(()=>{const r=${SECTION}.getBoundingClientRect();
      return {top:Math.round(r.top+scrollY),h:Math.round(r.height),
        vw:innerWidth,vh:innerHeight};})()`,
  );
};

const READ = `(()=>{const s=${SECTION};
  const tabs=[...s.querySelectorAll('[role="tab"]')];
  const head=s.querySelector("#testimonials-heading");
  const pinned=s.querySelector(".container-page");
  return {i: tabs.findIndex(t=>t.getAttribute("aria-selected")==="true"),
    headTop: Math.round(head.getBoundingClientRect().top),
    fixed: getComputedStyle(pinned).position==="fixed"};})()`;

/* ── 1. The pinned sequence ────────────────────────────────────────────
   Crawls the whole band and records where each quote first takes over. This is
   the assertion and the park table in one: every later pass needs to stop on a
   known quote, and a hard-coded offset would only be right until the copy or
   the step distance changed. */
const geo = await boot("no-preference");
console.log(`\n── pinned sequence ── (band ${geo.h}px in a ${geo.vw}x${geo.vh} frame)`);

/* Only the samples taken while the band is actually pinned count. Index 0 is
   also what an untouched page reads far above the section, so scanning from the
   lead-in would record the park point for the first quote as an offset where the
   band is not even on screen — and every later pass parks by this table. */
const firstAt = new Map();
const tops = new Map();
const order = [];
let sawFixed = false;
for (let y = geo.top - geo.vh; y < geo.top + geo.h + geo.vh; y += 24) {
  await ev(`scrollTo({top:${y},behavior:"instant"})`);
  await sleep(28);
  const r = await ev(READ);
  if (!r.fixed) continue;
  sawFixed = true;
  tops.set(r.headTop, (tops.get(r.headTop) || 0) + 1);
  if (!firstAt.has(r.i)) { firstAt.set(r.i, y); order.push(r.i); }
}

sawFixed ? pass("the band pins") : fail("the band never pins — nothing held still");
firstAt.size === 7
  ? pass("all 7 quotes are reached by scrolling")
  : fail(`only ${firstAt.size} of 7 quotes were reached: ${[...firstAt.keys()].join(",")}`);
// Each quote must arrive once, in order. A band that jumps 0,3,1,4 has a
// progress mapping that is wrong even though every quote does appear.
const monotonic = order.every((v, k) => v === k);
monotonic ? pass(`stepped in order: ${order.join(" → ")}`) : fail(`out of order: ${order.join(" → ")}`);
/* While pinned the heading does not move. Any drift means the pin is not
   holding — usually an overflow ancestor, which disables it silently.
   Reported as a histogram rather than a range: one stray reading at the moment
   the pin engages is a different defect from the whole hold sitting at two
   different heights, and a max-minus-min cannot tell them apart. */
const spread = [...tops.entries()].sort((a, b) => b[1] - a[1]);
const settled = spread[0][1];
const strays = [...tops.values()].reduce((a, b) => a + b, 0) - settled;
strays === 0
  ? pass(`heading held at ${spread[0][0]}px for all ${settled} pinned samples`)
  : fail(`heading held at ${spread.map(([t, n]) => `${t}px x${n}`).join(", ")}`);
// The whole sequence should cost a few screens of scroll, not twenty.
const span = Math.max(...firstAt.values()) - Math.min(...firstAt.values());
span > geo.vh && span < geo.vh * 6
  ? pass(`sequence spans ${span}px (${(span / geo.vh).toFixed(1)} screens)`)
  : fail(`sequence spans ${span}px (${(span / geo.vh).toFixed(1)} screens) — outside 1–6`);

/* ── 2. Contrast, both themes ──────────────────────────────────────────
   The spotlight card is translucent over an accent wash and the rail's rows
   change background with selection, so nothing here can be graded from the
   declared colours — every sample is taken off the painted pixels with the copy
   hidden for one frame, blurred to glyph scale. */
console.log("\n── contrast ──");
const TARGETS = [
  { name: "heading", sel: "#testimonials-heading", need: 3 },
  { name: "eyebrow", sel: ".eyebrow", need: 4.5 },
  { name: "quote", sel: "blockquote p", need: 3 },
  { name: "quoted name", sel: "figcaption span:first-child", need: 4.5 },
  { name: "quoted role", sel: "figcaption span:last-child", need: 4.5 },
  { name: "rail on", sel: '[role="tab"][aria-selected="true"] span span:first-child', need: 4.5 },
  { name: "rail off", sel: '[role="tab"][aria-selected="false"] span span:first-child', need: 4.5 },
];

/* Two steps, not one: quote 0 is short and quote 3 is the long one, and the
   card is a different height and a different type size on each. Grading one
   would leave the other's crop unmeasured. */
for (const step of [0, 3]) {
  for (const theme of ["dark", "light"]) {
    await ev(`document.documentElement.setAttribute("data-theme","${theme}")`);
    await ev(`scrollTo({top:${firstAt.get(step)},behavior:"instant"})`);
    // Long enough for the crossfade and the card's height tween to settle, so
    // the boxes measured are the ones the capture holds.
    await sleep(1200);

    const boxes = await ev(
      `(()=>{const s=${SECTION};return ${JSON.stringify(TARGETS)}.map(t=>{
        const el=s.querySelector(t.sel); if(!el) return {name:t.name,missing:true};
        const r=el.getBoundingClientRect();
        return {name:t.name,need:t.need,fg:getComputedStyle(el).color,
         x:Math.round(r.left),y:Math.round(r.top),
         w:Math.round(r.width),h:Math.round(r.height)};});})()`,
    );

    const dressed = png((await cmd("Page.captureScreenshot", { format: "png" })).result.data);
    if (step === 0) writeFileSync(`${OUT}\\quotes-${theme}.png`, dressed);

    // visibility, not display: the layout must not shift, or the boxes measured
    // above stop describing the frame being sampled.
    const HIDE = `${SECTION}.querySelector(".container-page").style.visibility=`;
    await ev(`${HIDE}"hidden"`);
    await sleep(320);
    const bare = png((await cmd("Page.captureScreenshot", { format: "png" })).result.data);
    await ev(`${HIDE}""`);
    if (Buffer.compare(bare, dressed) === 0) {
      throw new Error(`[${theme} step ${step}] bare frame identical to dressed — the hide did not land`);
    }

    for (const b of boxes) {
      if (b.missing) { fail(`${theme} ${b.name}: selector matched nothing`); continue; }
      if (b.w < 2 || b.h < 2) { fail(`${theme} ${b.name}: zero-size box`); continue; }
      /* Off-screen boxes are a failed test, not a skipped one. sharp would throw
         on the out-of-bounds crop anyway, but reporting it as a miss is what
         says "the band no longer fits", whereas a silent skip would print a
         clean sheet with a target never measured at all. */
      if (b.y < 0 || b.y + b.h > geo.vh || b.x < 0 || b.x + b.w > geo.vw) {
        fail(`${theme} s${step} ${b.name}: box ${b.x},${b.y} ${b.w}x${b.h} is outside the frame`);
        continue;
      }
      /* Blurred before measuring. A per-pixel minimum is meaningless over a
         gradient wash: any backdrop whose luminance range straddles the text's
         scores 1.00:1 on some single pixel. The eye integrates over roughly a
         stem width, so an 8px blur is what it actually sees behind a glyph. */
      const { data, info } = await sharp(bare)
        .extract({ left: b.x, top: b.y, width: b.w, height: b.h })
        .blur(8).raw().toBuffer({ resolveWithObject: true });
      const fg = b.fg.match(/[\d.]+/g).map(Number);
      const lf = lum(fg[0], fg[1], fg[2]);
      const rs = [];
      for (let i = 0; i < data.length; i += info.channels) {
        rs.push(ratio(lf, lum(data[i], data[i + 1], data[i + 2])));
      }
      rs.sort((x, y) => x - y);
      const p2 = rs[Math.floor(rs.length * 0.02)];
      const line = `${theme.padEnd(6)} s${step} ${b.name.padEnd(12)} p2=${p2.toFixed(2)}:1 need ${b.need}`;
      p2 >= b.need ? pass(line) : fail(line);
    }
  }
}

/* ── 3. Tablist contract ───────────────────────────────────────────────── */
console.log("\n── tablist a11y ──");
await ev(`document.documentElement.setAttribute("data-theme","dark")`);
const a11y = await ev(`(()=>{const s=${SECTION};
  const tabs=[...s.querySelectorAll('[role="tab"]')];
  const panel=s.querySelector('[role="tabpanel"]');
  return {
    count: tabs.length,
    selected: tabs.filter(t=>t.getAttribute("aria-selected")==="true").length,
    // Exactly one tab in the tab order; the arrows move within the list.
    focusable: tabs.filter(t=>t.tabIndex===0).length,
    controlsResolve: tabs.every(t=>t.getAttribute("aria-controls")===panel?.id),
    panelLabelled: panel?.getAttribute("aria-labelledby")===tabs.find(t=>t.getAttribute("aria-selected")==="true")?.id,
    // Decorative avatars must not be announced alongside the name beside them.
    avatarsSilent: [...s.querySelectorAll('[role="tab"] img')].every(i=>i.alt===""),
    orientation: s.querySelector('[role="tablist"]')?.getAttribute("aria-orientation"),
  };})()`);
a11y.count === 7 ? pass("7 tabs") : fail(`expected 7 tabs, got ${a11y.count}`);
a11y.selected === 1 ? pass("exactly one selected") : fail(`${a11y.selected} tabs selected`);
a11y.focusable === 1 ? pass("roving focus: one tabbable") : fail(`${a11y.focusable} tabbable tabs`);
a11y.controlsResolve ? pass("aria-controls resolves to the panel") : fail("aria-controls does not resolve");
a11y.panelLabelled ? pass("panel labelled by its tab") : fail("panel not labelled by the selected tab");
a11y.avatarsSilent ? pass("avatars decorative") : fail("an avatar carries alt text");
a11y.orientation === "vertical" ? pass("aria-orientation vertical") : fail(`orientation=${a11y.orientation}`);

/* Clicking a name while pinned must move the scrollbar, not just the index.
   Setting the index alone leaves the two disagreeing, and the next wheel event
   snaps the visitor back to the step the scrollbar still thinks they are on. */
await ev(`scrollTo({top:${firstAt.get(0)},behavior:"instant"})`);
await sleep(900);
const beforeY = await ev("Math.round(scrollY)");
await ev(`${SECTION}.querySelectorAll('[role="tab"]')[5].click()`);
await sleep(1600);
const afterY = await ev("Math.round(scrollY)");
const afterI = await ev(`[...${SECTION}.querySelectorAll('[role="tab"]')]
  .findIndex(t=>t.getAttribute("aria-selected")==="true")`);
afterY > beforeY
  ? pass(`a click scrolls the page: ${beforeY} → ${afterY}`)
  : fail(`a click left the scrollbar at ${afterY} — index and scroll now disagree`);
afterI === 5 ? pass("the click lands on the client picked") : fail(`clicked 5, landed on ${afterI}`);

/* Arrow keys must move selection AND focus together, otherwise the visible
   selection and the screen-reader cursor drift apart. While pinned a keystroke
   starts a smooth scroll and the selection only lands when the scroll does, so
   this waits for the scrollbar to stop rather than sleeping a fixed span: a
   flat wait long enough for one step is far too short for Home, which travels
   the whole 2232px sequence, and grading mid-flight reads as "Home went to the
   wrong quote" when it is simply still on its way there. */
const settle = async () => {
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await sleep(120);
    const y = await ev("Math.round(scrollY)");
    if (y === last) return;
    last = y;
  }
};
const send = async (key) => {
  await ev(`(()=>{const t=[...${SECTION}.querySelectorAll('[role="tab"]')];
    t[t.findIndex(x=>x.getAttribute("aria-selected")==="true")]
      .dispatchEvent(new KeyboardEvent("keydown",{key:${JSON.stringify(key)},bubbles:true}));})()`);
  await settle();
  // A beat past the scroll for the state update the last onUpdate queued.
  await sleep(300);
  return ev(`[...${SECTION}.querySelectorAll('[role="tab"]')]
    .findIndex(t=>t.getAttribute("aria-selected")==="true")`);
};
await ev(`scrollTo({top:${firstAt.get(0)},behavior:"instant"})`);
await sleep(900);
await ev(`${SECTION}.querySelectorAll('[role="tab"]')[0].focus()`);
await send("ArrowDown");
const afterDown = await send("ArrowDown");
const afterEnd = await send("End");
const afterHome = await send("Home");
const focusFollows = await ev(
  `document.activeElement===${SECTION}.querySelectorAll('[role="tab"]')[${afterHome}]`,
);
afterDown === 2 ? pass("ArrowDown x2 → index 2") : fail(`ArrowDown x2 → ${afterDown}`);
afterEnd === 6 ? pass("End → last") : fail(`End → ${afterEnd}`);
afterHome === 0 ? pass("Home → first") : fail(`Home → ${afterHome}`);
focusFollows ? pass("focus follows selection") : fail("focus did not follow selection");

/* ── 4. Narrow screens keep the timer ──────────────────────────────────
   Below the pin's breakpoint there is no scroll sequence, so the band has to
   fall back to advancing on its own — otherwise a phone visitor sees exactly
   one quote and no sign there are seven. */
console.log("\n── narrow-screen fallback ──");
const gN = await boot("no-preference", { width: 900, height: 820 });
const idx = `(()=>[...${SECTION}.querySelectorAll('[role="tab"]')]
  .findIndex(t=>t.getAttribute("aria-selected")==="true"))()`;
const notPinned = await ev(`getComputedStyle(${SECTION}.querySelector(".container-page")).position!=="fixed"`);
notPinned ? pass(`no pin at ${gN.vw}px wide`) : fail(`the band still pins at ${gN.vw}px`);

// Off-screen the rotation must not run: a band that cycles below the fold looks
// identical in every screenshot and still greets the visitor mid-sequence.
await ev(`scrollTo({top:0,behavior:"instant"})`);
await sleep(9500);
const parked = await ev(idx);
parked === 0 ? pass("held on the first quote while off-screen") : fail(`rotated to ${parked} before anyone scrolled to it`);

await ev(`scrollTo({top:${Math.round(gN.top - Math.max(0, (gN.vh - gN.h) / 2))},behavior:"instant"})`);
await sleep(1200);
const t0 = await ev(idx);
await sleep(9500);
const t1 = await ev(idx);
t1 !== t0 ? pass(`advanced once on screen: ${t0} → ${t1}`) : fail(`still on ${t0} after 9.5s in view`);

await ev(`${SECTION}.querySelectorAll('[role="tab"]')[4].click()`);
await sleep(600);
const picked = await ev(idx);
await sleep(9500);
const held = await ev(idx);
picked === 4 && held === 4
  ? pass("a click claims the panel and the rotation stops")
  : fail(`clicked 4, then read ${picked} → ${held}`);

/* ── 5. Reduced motion ─────────────────────────────────────────────────── */
console.log("\n── reduced motion ──");
const gR = await boot("reduce");
await ev(`scrollTo({top:${Math.round(gR.top - Math.max(0, (gR.vh - gR.h) / 2))},behavior:"instant"})`);
await sleep(1200);
const rmPin = await ev(`getComputedStyle(${SECTION}.querySelector(".container-page")).position!=="fixed"`);
rmPin ? pass("no pin under reduce") : fail("the band pins despite reduce");
const rm0 = await ev(idx);
const rmVis = await ev(
  `(()=>{const p=${SECTION}.querySelector('[role="tabpanel"]');
    return {op:Number(getComputedStyle(p).opacity),
      vis:getComputedStyle(p).visibility,
      text:p.querySelector("blockquote p").textContent.trim().length};})()`,
);
await sleep(9500);
const rm1 = await ev(idx);
rm0 === rm1 ? pass(`no auto-advance under reduce (held on ${rm0})`) : fail(`advanced ${rm0} → ${rm1} despite reduce`);
rmVis.op === 1 && rmVis.vis === "visible" && rmVis.text > 40
  ? pass("quote fully visible with no tweens")
  : fail(`panel opacity=${rmVis.op} visibility=${rmVis.vis} len=${rmVis.text}`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall testimonial checks pass");
sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
