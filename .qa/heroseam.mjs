/* The dark overlay used to travel upward on scroll, so the last strip of the
   hero lost its cover and a band of raw footage appeared above a hard cut into
   the next section. This walks the page down and, at each stop, reads a column
   of pixels straight through the hero/next-section boundary looking for a jump.
   Usage: node .qa/heroseam.mjs */
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
const { default: sharp } = await import(
  pathToFileURL(createRequire(import.meta.url).resolve("sharp")).href
);
const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9431", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-seam`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9431/json/list")).json();
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
const ev = async (x) =>
  (await cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }))
    .result?.result?.value;
const shot = async () =>
  Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).result.data, "base64");

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
await sleep(6500);

/* Lenis drives scrolling, so window.scrollTo is not enough on its own — the
   smooth-scroll layer owns the position and would animate back. Ask it. */
const scrollTo = async (y) => {
  await ev(`(()=>{const l=window.__lenis;
    if(l&&l.scrollTo) l.scrollTo(${y},{immediate:true}); else window.scrollTo(0,${y});})()`);
  await sleep(650);
  return ev("Math.round(window.scrollY)");
};

const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const relLum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/* One 40px-wide column of rows through the boundary, averaged across the
   width so a bright object in the footage does not read as a seam. */
async function rowsThrough(buf, xCentre, yTop, height) {
  const { data, info } = await sharp(buf)
    .extract({ left: Math.max(0, xCentre - 20), top: Math.max(0, yTop), width: 40, height })
    .raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const rows = [];
  for (let y = 0; y < info.height; y++) {
    let sum = 0, r = 0, g = 0, b = 0;
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * ch;
      sum += relLum(data[i], data[i + 1], data[i + 2]);
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    }
    const n = info.width;
    rows.push({ lum: sum / n, rgb: [r / n, g / n, b / n] });
  }
  return rows;
}

/* The CEO section opens with a deliberate 1px gold rule —
   `linear-gradient(to right, var(--accent), transparent 60%)` — which lands
   exactly on the boundary and reads as a luminance step. It is not the defect
   this probe is looking for, so it is identified by hue and excused: gold runs
   warm (r > b by a wide margin), the grey seam of an uncovered handoff does
   not. */
const isGoldRule = ([r, g, b]) => r - b > 24 && r > g && g > b;

const heroH = await ev(`document.querySelector("section").getBoundingClientRect().height`);
console.log(`hero height ${Math.round(heroH)}px\n`);

let worstJump = 0, worstAt = null, worstGap = 0, worstGapAt = null;
for (const frac of [0.25, 0.4, 0.55, 0.7, 0.85]) {
  const y = Math.round(heroH * frac);
  const at = await scrollTo(y);
  /* Where the hero's bottom edge currently sits in the viewport. */
  const edge = await ev(
    `Math.round(document.querySelector("section").getBoundingClientRect().bottom)`,
  );
  if (edge < 60 || edge > 840) { console.log(`  scroll ${at}px — boundary off-screen, skipped`); continue; }

  const buf = await shot();
  /* 60px above the edge to 60px below it, sampled left (under the copy) and
     centre-right (over open footage). */
  for (const [name, xc] of [["left", 200], ["right", 1100]]) {
    const rows = await rowsThrough(buf, xc, edge - 60, 120);
    let jump = 0, jAt = 0, gold = false;
    for (let i = 1; i < rows.length; i++) {
      const d = Math.abs(rows[i].lum - rows[i - 1].lum);
      /* A row the accent rule owns is skipped, not counted. */
      if (isGoldRule(rows[i].rgb) || isGoldRule(rows[i - 1].rgb)) { gold = true; continue; }
      if (d > jump) { jump = d; jAt = i; }
    }
    const mean = (a) => a.reduce((s, x) => s + x.lum, 0) / a.length;
    const above = mean(rows.slice(48, 58));
    const below = mean(rows.slice(62, 72));
    const tag = jump > 0.012 ? "SEAM" : "ok  ";
    console.log(
      `  ${tag} scroll ${String(at).padStart(4)}px  edge y=${edge}  ${name.padEnd(5)}` +
      `  step ${jump.toFixed(4)} at row ${jAt}` +
      `  above ${above.toFixed(4)} below ${below.toFixed(4)}` +
      `  gap ${Math.abs(above - below).toFixed(4)}${gold ? "  (accent rule excused)" : ""}`,
    );
    if (jump > worstJump) { worstJump = jump; worstAt = `scroll ${at}px, ${name}`; }
    if (Math.abs(above - below) > worstGap) {
      worstGap = Math.abs(above - below); worstGapAt = `scroll ${at}px, ${name}`;
    }
  }
}

console.log(`\nworst luminance step across the boundary: ${worstJump.toFixed(4)} (${worstAt})`);
console.log(`worst brightness gap above vs below:     ${worstGap.toFixed(4)} (${worstGapAt})`);
/* Two ways the old bug showed: a hard line at the join, and the strip of
   uncovered footage just above it sitting brighter than the section below. */
const ok = worstJump <= 0.012 && worstGap <= 0.006;
console.log(ok
  ? "PASS  no hard line and no bright strip — the handoff stays covered through the scroll"
  : "FAIL  the boundary is still showing");

/* Also confirm the non-fading layer really does hold at full strength while
   the type-serving layers go. */
await scrollTo(Math.round(heroH * 0.8));
await writeFile(`${OUT}\\hero-seam.png`, await shot());
console.log(`\n  shot  .qa\\hero-seam.png  (hero bottom mid-scroll)`);
const layers = await ev(`(()=>{const h=document.querySelector("section div[aria-hidden]");
  const s=h.querySelector("[data-hero-scrim]");
  const f=s.querySelector("[data-hero-scrim-fade]");
  const cs=getComputedStyle(s), cf=getComputedStyle(f);
  const copy=document.querySelector("section [data-hero-exit].container-page");
  return {scrimOpacity:cs.opacity, scrimTransform:cs.transform,
    fadeOpacity:cf.opacity, fadeTransform:cf.transform,
    copyOpacity:copy?getComputedStyle(copy).opacity:null,
    copyTransform:copy?getComputedStyle(copy).transform:null};})()`);
console.log("\nat 80% through the hero:");
console.log(`  scrim wrapper   opacity ${layers.scrimOpacity}  transform ${layers.scrimTransform}`);
console.log(`  fading layers   opacity ${layers.fadeOpacity}  transform ${layers.fadeTransform}`);
console.log(`  copy            opacity ${layers.copyOpacity}  transform ${layers.copyTransform}`);
const scrimStill = layers.scrimTransform === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(layers.scrimTransform);
console.log(scrimStill
  ? "  PASS  the scrim wrapper never translates"
  : "  FAIL  the scrim wrapper is being moved");

sock.close(); chrome.kill(); process.exit(0);
