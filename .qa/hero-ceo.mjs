/* Grades the two changes: the hero overlays were lightened so the footage reads,
   and the CEO portrait was replaced. The lightening is the risky one — every
   point of opacity given back to the video is taken away from the headline's
   contrast, so the type is measured against the real composited pixels rather
   than trusted. Also A/Bs the old gradient values against the new ones so the
   improvement is a number, not an impression.
   Usage: node .qa/hero-ceo.mjs */
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { writeFile } from "node:fs/promises";

import { createRequire } from "node:module";
// The ESM loader rejects a bare Windows drive letter, so sharp has to be
// resolved to a path and handed over as a file:// URL.
const { default: sharp } = await import(pathToFileURL(createRequire(import.meta.url).resolve("sharp")).href);
const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9418", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-heroceo`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9418/json/list")).json();
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
  return result?.result?.value;
};
const shot = async () => Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).result.data, "base64");

let failed = 0;
const fail = (m) => { failed++; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  PASS  ${m}`);

await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/" });
for (let i = 0; i < 60; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(6500); // let the loader clear and the hero intro settle

/* Playback is sampled here, before anything below pauses the clip to pin a
   frame. Asserted further down, but the answer has to be taken while the page
   is still untouched or the probe is only observing its own seek. */
const live = await ev(`(()=>{const v=document.querySelector("section video");
  if(!v) return null; return {paused:v.paused, t:v.currentTime};})()`);

/* ── luminance helpers ────────────────────────────────────────────────── */
const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const relLum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/* Screenshot pixels per CSS pixel. 1 on the desktop pass, 2 under the phone
   emulation — and the DOM reports rects in CSS pixels either way, so without
   this every mobile crop lands on a quarter of the intended region. That is
   what put "View our work" at 1.01:1: the crop fell off the gold pill onto the
   dark plate beside it. */
let dpr = 1;

async function lumas(buf, box) {
  const { data, info } = await sharp(buf)
    .extract({ left: Math.max(0, Math.round(box.x * dpr)), top: Math.max(0, Math.round(box.y * dpr)),
      width: Math.max(1, Math.round(box.w * dpr)), height: Math.max(1, Math.round(box.h * dpr)) })
    .blur(8 * dpr).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels; const out = [];
  // RGB is kept, not just luminance: translucent text has to be composited
  // against the actual pixel behind it before its contrast means anything.
  for (let i = 0; i < data.length; i += ch) {
    out.push({ l: relLum(data[i], data[i + 1], data[i + 2]), r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  return out.sort((a, b) => a.l - b.l);
}
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];

/* The clip is 17s of moving picture, so any two screenshots are two different
   frames. Every measurement below pins the video to one timestamp first, or the
   frame-to-frame variance swamps whatever is being measured. */
const seek = async (t) => {
  await ev(`(()=>{const v=${HERO}.querySelector("video");
    v.pause(); v.currentTime=${t}; return true;})()`);
  for (let i = 0; i < 40; i++) {
    if (await ev(`(()=>{const v=${HERO}.querySelector("video");
      return v.readyState>=2 && Math.abs(v.currentTime-${t})<0.35;})()`)) break;
    await sleep(120);
  }
  await sleep(260);
};

/* ── 1. Did the footage actually get clearer? ──────────────────────────
   Measured in the picture band — the strip between the navbar and the top of
   the copy block, derived from the eyebrow's own position rather than a fixed
   percentage. That is the only part of the frame with no type over it, so it is
   the only part where opacity can be given back for free, and grading a band
   that overlaps the headline would just report that the scrim there is still
   (correctly) heavy. The old values are then re-applied live and the same band
   re-measured, so the two are directly comparable on the same frame of video. */
console.log("\n── the footage reads better ──");
const HERO = `document.querySelector("section")`;
const bands = await ev(`(()=>{const r=${HERO}.getBoundingClientRect();
  const W=r.width, H=r.height;
  return {
    /* The half the new scrim deliberately opens. Nothing here needs contrast —
       the laurel badges are artwork with their own drop-shadow. */
    open:{x:Math.round(W*0.58),y:Math.round(H*0.16),w:Math.round(W*0.38),h:Math.round(H*0.48)},
    /* And the half it deliberately darkens, reported alongside so the trade is
       visible rather than implied. */
    copy:{x:Math.round(W*0.02),y:Math.round(H*0.18),w:Math.round(W*0.34),h:Math.round(H*0.62)}};})()`);
console.log(`  open band ${bands.open.w}x${bands.open.h} at (${bands.open.x}, ${bands.open.y})`);

const meanOf = async (buf, box) => {
  const l = await lumas(buf, box);
  return l.reduce((a, c) => a + c.l, 0) / l.length;
};
await seek(6); // one fixed frame, so old-vs-new is the same picture twice
const nowShot = await shot();
const nowLum = await meanOf(nowShot, bands.open);
const nowCopy = await meanOf(nowShot, bands.copy);

/* The baseline is rebuilt rather than edited in place: the scrim is a stack of
   four directional layers now, so there is no single node whose value can be
   reverted. The current stack is hidden and the original two gradients are
   injected as one node in its place — the radial listed first because in CSS
   the first background paints on top, which is the order the two <div>s had. */
const BEFORE =
  "radial-gradient(120% 90% at 78% 32%, transparent 30%, rgb(8 8 8 / 0.72) 100%)," +
  "linear-gradient(to top, var(--bg) 2%, rgb(8 8 8 / 0.82) 26%, rgb(8 8 8 / 0.28) 62%, rgb(8 8 8 / 0.55))";
const swapped = await ev(`(()=>{const holder=${HERO}.querySelector("div[aria-hidden]");
  const scrim=holder&&holder.querySelector("[data-hero-exit]");
  if(!scrim) return null;
  window.__scrim=scrim; scrim.style.opacity="0";
  const old=document.createElement("div"); old.id="__oldscrim";
  old.style.cssText="position:absolute;inset:0;background:${BEFORE}";
  holder.insertBefore(old, scrim);
  return true;})()`);
if (!swapped) fail("could not locate the hero scrim — the A/B is not measurable");
await sleep(160);
const oldShot = swapped ? await shot() : null;
const oldLum = oldShot ? await meanOf(oldShot, bands.open) : 0;
const oldCopy = oldShot ? await meanOf(oldShot, bands.copy) : 0;
await ev(`(()=>{const o=document.getElementById("__oldscrim"); if(o) o.remove();
  if(window.__scrim) window.__scrim.style.opacity="";})()`);
await sleep(180);
/* The A/B hides the live scrim to paint the old one underneath. If the restore
   ever silently fails, every contrast number below is measured against bare
   footage and the whole section becomes a lie that still prints numbers — so
   the restore is asserted, not assumed. */
const restored = await ev(`(()=>{const s=window.__scrim; if(!s) return null;
  return {op:getComputedStyle(s).opacity, stale:!!document.getElementById("__oldscrim"),
    layers:[...s.children].length};})()`);
if (!restored || Number(restored.op) < 0.99 || restored.stale) {
  fail(`scrim not restored after the A/B (opacity ${restored?.op}, stale old layer: ${restored?.stale}) — contrast numbers below would be meaningless`);
} else {
  pass(`scrim restored: ${restored.layers} layers at opacity ${restored.op}`);
}

if (swapped) {
  const gain = ((nowLum - oldLum) / oldLum) * 100;
  const copyDelta = ((nowCopy - oldCopy) / oldCopy) * 100;
  gain > 25
    ? pass(`open half is ${gain.toFixed(0)}% brighter than before (${oldLum.toFixed(4)} → ${nowLum.toFixed(4)})`)
    : fail(`only ${gain.toFixed(0)}% brighter — the change is not perceptible`);
  console.log(`  copy column ${copyDelta >= 0 ? "+" : ""}${copyDelta.toFixed(0)}% — the side of the trade the type pays for`);
}
/* ── 2. The type still survives it ─────────────────────────────────────
   The cost side of the same trade. Every text node in the hero is measured
   against the pixels actually behind it: hide the copy for one frame with
   `visibility` (not `display`, which would reflow and move the boxes), sample
   the plate, then compare to the text colour. */
console.log("\n── hero type still legible over the brighter plate ──");
/* Every text node in the hero and the navbar, walked rather than selected.

   Two earlier attempts got this wrong in opposite directions. Selecting
   elements and measuring `getBoundingClientRect` graded the eyebrow's
   full-width mask box — mostly open frame with no glyphs in it. Ranging over
   an element's whole contents then graded the CTA wrapper as one node, so
   near-white label text was measured against the gold pill sitting beside it.
   A text node has neither problem: its rects are exactly where ink lands.

   No inset or fill special-casing is needed as a result — the rect is already
   deep inside any button it belongs to. */
const BOXES_JS = `(()=>{const out=[];
  const roots=[document.querySelector("section"), document.querySelector("header")].filter(Boolean);
  for(const root of roots){
    const w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode:(n)=>n.textContent.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
    for(let n=w.nextNode(); n; n=w.nextNode()){
      const el=n.parentElement; if(!el) continue;
      const cs=getComputedStyle(el);
      if(cs.visibility==="hidden"||cs.display==="none"||Number(cs.opacity)<0.05) continue;
      const rng=document.createRange(); rng.selectNodeContents(n);
      const rects=[...rng.getClientRects()]
        .filter(r=>r.width>=8&&r.height>=6&&r.top>=0&&r.bottom<=innerHeight);
      rng.detach();
      if(!rects.length) continue;
      const t=n.textContent.trim().slice(0,34);
      rects.forEach((r,i)=>out.push({t, line:i, lines:rects.length,
        x:r.left,y:r.top,w:r.width,h:r.height, color:cs.color,
        size:Number.parseFloat(cs.fontSize), weight:Number(cs.fontWeight)||400}));
    }}
  return out;})()`;
const boxes = await ev(BOXES_JS);
const labels = [...new Set(boxes.map((b) => b.t))];
console.log(`  measuring ${boxes.length} line boxes across ${labels.length} text nodes`);

/* Colours are resolved by Chrome, not by regex. Tailwind v4 emits `text-white/50`
   as `oklab(0.999994 0.0000456 0.0000201 / 0.5)`, and pulling the first three
   numbers out of that reads a near-white glyph as near-black — which is exactly
   how "EST. 2017 · KARACHI" came back at 1.03:1 on the previous run.
   Painting the colour twice, over black and over white, recovers both the alpha
   and the straight RGB for any syntax the browser can parse:
     onBlack = a·C            onWhite = a·C + (1-a)·255
   so a = 1 - (onWhite - onBlack)/255, and C = onBlack / a. */
const resolved = new Map();
async function resolveColor(css) {
  if (resolved.has(css)) return resolved.get(css);
  const raw = await ev(`(()=>{const c=document.createElement("canvas");c.width=c.height=1;
    const x=c.getContext("2d",{willReadFrequently:true});
    const on=(bg)=>{x.clearRect(0,0,1,1);x.fillStyle=bg;x.fillRect(0,0,1,1);
      x.fillStyle=${JSON.stringify(css)};x.fillRect(0,0,1,1);
      return [...x.getImageData(0,0,1,1).data].slice(0,3);};
    return {b:on("#000"), w:on("#fff")};})()`);
  const a = Math.min(1, Math.max(0, 1 - (raw.w[0] - raw.b[0]) / 255));
  const c = a < 0.01
    ? { r: 0, g: 0, b: 0, a: 0 }
    : { r: raw.b[0] / a, g: raw.b[1] / a, b: raw.b[2] / a, a };
  resolved.set(css, c);
  return c;
}
/* Percentile sweep rather than a single "worst" guess: with translucent type,
   raising the plate raises the composited glyph too, so which plate pixel is
   the harshest is not something to reason about in advance — every one of them
   is tried and the lowest ratio kept. */
const PCTS = [0.02, 0.1, 0.3, 0.5, 0.7, 0.9, 0.98];
const worstRatio = (fgc, back) => {
  let lo = Infinity;
  for (const p of PCTS) {
    const px = pct(back, p);
    const cl = relLum(
      fgc.a * fgc.r + (1 - fgc.a) * px.r,
      fgc.a * fgc.g + (1 - fgc.a) * px.g,
      fgc.a * fgc.b + (1 - fgc.a) * px.b,
    );
    lo = Math.min(lo, ratio(cl, px.l));
  }
  return lo;
};

/* Six frames across the 17s clip, not one. The headline sits over moving
   picture: clearing 3:1 at t=6 says nothing about the frame at t=13, and the
   whole point of lightening the scrim was to let more of that picture through. */
const FRAMES = [0.4, 3, 6, 9, 12, 15.5];

/* The whole contrast sweep, as a function so it can be re-run at a second
   viewport. The scrim darkens by *column*, which is a desktop assumption: on a
   phone the copy spans the full width, and the left layer that protects the
   eyebrow at 1440px may simply not reach far enough at 390px. That is the kind
   of thing this scrim could plausibly get wrong, so it is measured rather than
   reasoned about. */
async function contrastSweep(boxes) {
  const worstPer = new Map();
  for (const t of FRAMES) {
    await seek(t);
    /* Scoped to document, not the hero: the navbar is a sibling of the section
       and overlays it, so hiding only the section's leaves left the nav labels
       painted into the "plate" and every nav reading was taken against its own
       glyphs.

       Two different ways of removing type, because `visibility: hidden` removes
       the element's background as well as its glyphs. On the "Start a project"
       pill that took the gold fill away with the words and left the probe
       grading near-black text against bare footage — 1.02:1 for type that really
       sits on a solid accent button. Anything with a fill gets transparent text
       instead, so the plate underneath the glyphs is the fill itself. */
    await ev(`(()=>{const leaves=[...document.querySelectorAll("section *, header *")]
      .filter(e=>e.children.length===0&&e.textContent.trim());
      window.__hid=[]; window.__clear=[];
      for(const e of leaves){
        const bg=getComputedStyle(e).backgroundColor;
        if(/^(transparent|rgba\\(0, 0, 0, 0\\))$/.test(bg)){ e.style.visibility="hidden"; window.__hid.push(e); }
        else { e.style.color="transparent"; window.__clear.push(e); }
      }})()`);
    await sleep(240);
    const plate = await shot();
    await ev(`(()=>{window.__hid.forEach(e=>e.style.visibility="");
      window.__clear.forEach(e=>e.style.color="");})()`);

    for (const b of boxes) {
      const cr = worstRatio(await resolveColor(b.color), await lumas(plate, b));
      const prev = worstPer.get(b.t);
      if (!prev || cr < prev.cr) {
        worstPer.set(b.t, {
          cr, frame: t, color: b.color, line: b.line, lines: b.lines,
          size: b.size, weight: b.weight,
        });
      }
    }
  }
  return worstPer;
}

function report(worstPer) {
  let worst = { cr: Infinity, t: "" };
  for (const [text, w] of worstPer) {
    /* WCAG's "large text" is a type-size rule — 24px, or 18.66px at 700+ — not a
       box-height one. Grading on the measured line box let a 13px label inside a
       44px-tall button claim the 3:1 threshold it has no right to. */
    const large = w.size >= 24 || (w.size >= 18.66 && w.weight >= 700);
    const need = large ? 3 : 4.5;
    if (w.cr < worst.cr) worst = { cr: w.cr, t: text };
    const where = w.lines > 1 ? `line ${w.line + 1}/${w.lines}, ` : "";
    const type = `${w.size.toFixed(0)}px/${w.weight}`;
    w.cr >= need
      ? pass(`${w.cr.toFixed(2)}:1  "${text}"  (${type}, needs ${need}, ${where}worst t=${w.frame}s)`)
      : fail(`${w.cr.toFixed(2)}:1  "${text}" — needs ${need}:1 at ${type}, ${where}worst t=${w.frame}s, colour ${w.color}`);
  }
  console.log(`  worst overall: ${worst.cr.toFixed(2)}:1 on "${worst.t}"`);
}

report(await contrastSweep(boxes));

/* ── 2b. The same sweep at phone width ─────────────────────────────────
   Not a formality. The scrim's second layer darkens the left column, which
   only protects the copy while the copy stays in a column — at 390px it spans
   the full width and runs straight into the part of the frame the scrim was
   opened up. */
console.log("\n── and at 390px, where the copy is no longer in a column ──");
await cmd("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
});
dpr = 2;
await sleep(1800);
/* Re-collected, not reused: every rect from the desktop pass is wrong now, and
   the mp4 `media` query means a narrow viewport is also served a different
   rendition — so this measures the file phones actually get. */
const mBoxes = await ev(BOXES_JS);
console.log(`  measuring ${mBoxes.length} line boxes across ${[...new Set(mBoxes.map((b) => b.t))].length} text nodes`);
const mVid = await ev(`(()=>{const v=document.querySelector("section video");
  return v?v.currentSrc.split("/").pop():null;})()`);
console.log(`  serving ${mVid}`);
report(await contrastSweep(mBoxes));
await writeFile(`${OUT}\\hero-mobile.png`, await shot());
console.log(`  shot  .qa\\hero-mobile.png`);
await cmd("Emulation.clearDeviceMetricsOverride");
dpr = 1;
await sleep(1200);

/* ── 3. The video source ───────────────────────────────────────────────
   The mp4 fallbacks were regenerated from the new clip. If any <source> still
   pointed at old footage, a Safari visitor would silently get the previous
   video — which is the exact thing this change was meant to remove. */
console.log("\n── the hero video ──");
const vid = await ev(`(()=>{const v=${HERO}.querySelector("video"); if(!v) return null;
  return {srcs:[...v.querySelectorAll("source")].map(s=>({src:s.getAttribute("src"),type:s.type,media:s.media})),
    current:v.currentSrc, w:v.videoWidth, h:v.videoHeight, t:v.currentTime,
    paused:v.paused, dur:Math.round(v.duration*10)/10, poster:v.getAttribute("poster")};})()`);
if (!vid) fail("no <video> in the hero");
else {
  live && !live.paused && live.t > 0
    ? pass(`playing on arrival (t=${live.t.toFixed(1)}s)`)
    : fail("video is not playing");
  vid.srcs.some((s) => s.src.includes("cdn.jsdelivr.net") && s.type === "video/webm")
    ? pass("jsDelivr WebM is offered") : fail("the new WebM is not in the source list");
  vid.srcs.filter((s) => s.type === "video/mp4").length === 2
    ? pass("two mp4 fallbacks for browsers without VP9") : fail("mp4 fallbacks missing");
  vid.w > 0 ? pass(`decoded at ${vid.w}x${vid.h}`) : fail("video never decoded a frame");
  Math.abs(vid.dur - 17.2) < 0.5
    ? pass(`duration ${vid.dur}s matches the supplied clip`)
    : fail(`duration is ${vid.dur}s — expected 17.2s, so this is not the new footage`);
}

/* ── 4. The CEO portrait ───────────────────────────────────────────────
   The one image in the project with a standing "never substitute" rule, now
   swapped on the client's own instruction. Asserted for identity, not just
   presence, so a stale build serving the old PNG is caught. */
console.log("\n── the CEO portrait ──");
/* Scoped to the <figure>, not the section: the section's first <img> is the
   pinned studio backdrop, so `section img` grades the wrong picture entirely
   and reports a distorted 1424x805 "portrait". */
const ceo = await ev(`(()=>{const i=document.querySelector('[aria-labelledby="ceo-heading"] figure img');
  if(!i) return null;
  const box=i.closest("div"); const cs=getComputedStyle(box);
  const r=i.getBoundingClientRect();
  const m=/[?&]w=(\\d+)/.exec(i.currentSrc);
  return {src:i.getAttribute("src"), served:m?Number(m[1]):null, complete:i.complete,
    nat:i.naturalWidth, alt:i.getAttribute("alt"), fit:getComputedStyle(i).objectFit,
    radius:cs.borderTopLeftRadius, bw:cs.borderTopWidth, bc:cs.borderTopColor,
    ov:cs.overflow, w:Math.round(r.width), h:Math.round(r.height)};})()`);
if (!ceo) fail("no portrait in the CEO section");
else {
  ceo.src.includes("ceo-portrait.avif")
    ? pass("points at the client's new portrait") : fail(`still serving ${ceo.src}`);
  ceo.complete && ceo.nat > 0 ? pass("portrait decoded") : fail("portrait failed to load");
  Math.abs(ceo.w - ceo.h) <= 1
    ? pass(`square frame at ${ceo.w}px`)
    : fail(`frame is ${ceo.w}x${ceo.h}, not square`);
  ceo.fit === "cover" ? pass("object-cover — the square source is not stretched") : fail(`object-fit: ${ceo.fit}`);
  Number.parseFloat(ceo.radius) >= 16
    ? pass(`rounded corners at ${ceo.radius}`) : fail(`corner radius is only ${ceo.radius}`);
  Number.parseFloat(ceo.bw) > 0
    ? pass(`visible border: ${ceo.bw} ${ceo.bc}`) : fail("no border on the portrait frame");
  ceo.ov === "hidden" ? pass("image is clipped to the rounded frame") : fail(`overflow: ${ceo.ov} — corners will not clip`);
  ceo.served && ceo.served >= ceo.w
    ? pass(`served a ${ceo.served}px variant for a ${ceo.w}px box`)
    : ceo.served ? fail(`served only ${ceo.served}px for a ${ceo.w}px box`) : pass("served unoptimised");
  (ceo.alt || "").length > 8 ? pass(`alt: "${ceo.alt}"`) : fail("portrait has no useful alt text");
}

/* Captures for the user — image reads come back empty here. */
await ev(`scrollTo({top:0,behavior:"instant"})`);
await sleep(1400);
await seek(6); // pinned, so the capture is the same frame the numbers above describe
await writeFile(`${OUT}\\hero-video.png`, await shot());
console.log(`  shot  .qa\\hero-video.png`);
const cy = await ev(`(()=>{const s=document.querySelector('[aria-labelledby="ceo-heading"]');
  return Math.round(s.getBoundingClientRect().top+scrollY-60);})()`);
await ev(`scrollTo({top:${cy},behavior:"instant"})`);
await sleep(2000);
await writeFile(`${OUT}\\ceo-portrait.png`, await shot());
console.log(`  shot  .qa\\ceo-portrait.png`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall hero + CEO checks pass");
sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
