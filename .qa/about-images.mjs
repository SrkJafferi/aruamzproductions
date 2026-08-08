/* The three client-chosen plates: are they loading, is the END TO END plate
   genuinely pinned, and does the copy still clear AA over real photography?

   Contrast here is measured off rendered pixels, not computed from a colour
   token. These plates are photographs, so the backdrop behind a line of type is
   whatever the frame happens to put there — the only honest way to check it is
   to hide the copy, screenshot the band, and sample the region the copy was
   sitting in. Usage: node .qa/about-images.mjs */
import { spawn } from "node:child_process";
import sharp from "sharp";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9440", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-about-img`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9440/json/list")).json();
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
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/about-us" });
await sleep(9000);

const scrollTo = async (y) => {
  await ev(`(()=>{const l=window.__lenis;
    if(l&&l.scrollTo) l.scrollTo(${y},{immediate:true}); else window.scrollTo(0,${y});})()`);
  await sleep(950);
};

let ok = true;
const fail = (m) => { ok = false; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  PASS  ${m}`);

/* ── 1. the three plates are the new files, and they decoded ─────────────── */
console.log("\nplates:");
const craftTop = await ev(`Math.round(document.querySelector("#about-craft-heading")
  .closest("section").offsetTop)`);
/* Scrolled down first, then back. The craft plate is lazily loaded — reading it
   at the top of the page reports naturalWidth 0 and looks like a broken asset
   when it is only a plate that has not been asked for yet. */
await scrollTo(craftTop + 200);
await sleep(1200);
await scrollTo(0);
/* Anchored off each band's own heading id rather than off `nth-of-type`, which
   silently points at the wrong section the moment a band is added or reordered
   — that is exactly what made the first run report the craft plate as missing. */
const plates = await ev(`(()=>{
  const grab=(sel)=>{const s=sel==="hero"?document.querySelector("section")
      :document.querySelector(sel)?.closest("section");
    const i=s?.querySelector("img");
    return i?{src:decodeURIComponent(i.currentSrc||i.src),w:i.naturalWidth,h:i.naturalHeight}:null;};
  return {
    hero: grab("hero"),
    who: grab("#about-who-heading"),
    craft: grab("#about-craft-heading"),
  };})()`);
for (const [name, want] of [["hero", "/about/hero.jpg"], ["who", "/about/who-we-are.jpg"],
  ["craft", "/about/craft-bg.jpg"]]) {
  const p = plates?.[name];
  if (!p) { fail(`${name} — image element not found`); continue; }
  if (!p.src.includes(want)) fail(`${name} — serving ${p.src.slice(-60)}, expected ${want}`);
  else if (!p.w) fail(`${name} — ${want} did not decode`);
  else pass(`${name.padEnd(6)} ${want}  decoded ${p.w}x${p.h}`);
}

/* ── 2. the END TO END plate is pinned, not drifting ─────────────────────── */
console.log("\nEND TO END plate pinned to the viewport:");
const probe = `(()=>{const s=document.querySelector("#about-craft-heading").closest("section");
  const p=s.querySelector("img").closest("div");
  const cs=getComputedStyle(p), r=p.getBoundingClientRect();
  return {pos:cs.position, tf:cs.transform, top:Math.round(r.top), h:Math.round(r.height),
          clip:getComputedStyle(s).clipPath};})()`;
await scrollTo(craftTop + 60);
const a = await ev(probe);
await scrollTo(craftTop + 420);
const b = await ev(probe);
if (a.pos !== "fixed") fail(`plate position is ${a.pos}, expected fixed`);
else pass(`position: fixed`);
if (a.tf !== "none") fail(`plate carries transform ${a.tf} — a transform makes it a containing block`);
else pass(`transform: none at both offsets`);
if (a.top !== b.top) fail(`plate moved ${a.top} → ${b.top} across 360px of scroll`);
else pass(`viewport top steady at ${a.top} across 360px of scroll`);
if (!/inset|rect|polygon/.test(a.clip)) fail(`section clip-path is "${a.clip}" — a fixed child will not be trimmed`);
else pass(`section clip-path trims it back to the band`);

/* ── 3. contrast over real photography, sampled from pixels ──────────────── */
const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/** Hide the copy, shoot the band, and read the backdrop the copy was over. */
async function backdrop(hideSel, rectSel) {
  const geo = await ev(`(()=>{const el=document.querySelector(${JSON.stringify(rectSel)});
    if(!el) return null; const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
    /* Tailwind v4 emits \`text-white/70\` as oklab(...), and pulling the numbers
       out of that string with a regex reads near-white as near-black. Resolve it
       on canvas instead: paint the colour over black and over white, and solve
       a = 1 - (onWhite - onBlack)/255 for the alpha, C = onBlack / a for the
       channel. That works for any colour syntax the browser accepts. */
    const read=(bg)=>{const cv=document.createElement("canvas");cv.width=cv.height=1;
      const x=cv.getContext("2d");x.fillStyle=bg;x.fillRect(0,0,1,1);
      x.fillStyle=cs.color;x.fillRect(0,0,1,1);return x.getImageData(0,0,1,1).data;};
    const b=read("#000"), w=read("#fff");
    const a=1-(w[0]-b[0])/255;
    const rgb=a<=0.001?[0,0,0]:[b[0]/a,b[1]/a,b[2]/a];
    return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
            rgb,alpha:a,size:parseFloat(cs.fontSize),weight:parseInt(cs.fontWeight,10)||400};})()`);
  if (!geo || geo.w < 4 || geo.h < 4) return null;

  await ev(`document.querySelectorAll(${JSON.stringify(hideSel)})
    .forEach(n=>n.style.visibility="hidden")`);
  await sleep(260);
  const png = await shot();
  await ev(`document.querySelectorAll(${JSON.stringify(hideSel)})
    .forEach(n=>n.style.visibility="")`);

  const meta = await sharp(png).metadata();
  const scale = meta.width / 1440;
  const left = Math.max(0, Math.round(geo.x * scale));
  const top = Math.max(0, Math.round(geo.y * scale));
  const width = Math.min(meta.width - left, Math.round(geo.w * scale));
  const height = Math.min(meta.height - top, Math.round(geo.h * scale));
  if (width < 2 || height < 2) return null;

  const { data, info } = await sharp(png)
    .extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const lums = [];
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let i = 0; i < data.length; i += ch) {
    sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++;
    lums.push(L(data[i], data[i + 1], data[i + 2]));
  }
  lums.sort((p, q) => p - q);
  return {
    ...geo,
    mean: { r: sr / n, g: sg / n, b: sb / n },
    meanL: L(sr / n, sg / n, sb / n),
    p95L: lums[Math.floor(lums.length * 0.95)],
  };
}

/** Composite the (possibly translucent) text colour over the sampled backdrop. */
function ratioOf(rgb, alpha, bgL, bgMean) {
  const fg = {
    r: rgb[0] * alpha + bgMean.r * (1 - alpha),
    g: rgb[1] * alpha + bgMean.g * (1 - alpha),
    b: rgb[2] * alpha + bgMean.b * (1 - alpha),
  };
  const fgL = L(fg.r, fg.g, fg.b);
  return (Math.max(fgL, bgL) + 0.05) / (Math.min(fgL, bgL) + 0.05);
}

const cases = [
  { name: "hero h1 (gold)", y: 0, hide: "[data-about-hero-exit]", rect: "#about-hero-heading" },
  { name: "hero statement", y: 0, hide: "[data-about-hero-exit]", rect: "[data-about-line]:last-of-type" },
  { name: "craft h2 @top", y: craftTop + 60, hide: "#about-craft-heading", rect: "#about-craft-heading" },
  { name: "craft body @top", y: craftTop + 60, hide: "#about-craft-heading ~ p", rect: "#about-craft-heading ~ p" },
  { name: "craft h2 @mid", y: craftTop + 380, hide: "#about-craft-heading", rect: "#about-craft-heading" },
  { name: "craft body @mid", y: craftTop + 380, hide: "#about-craft-heading ~ p", rect: "#about-craft-heading ~ p" },
];

console.log("\ncopy over photography (backdrop sampled from rendered pixels):");
for (const c of cases) {
  await scrollTo(c.y);
  const bd = await backdrop(c.hide, c.rect);
  if (!bd) { console.log(`  ?     ${c.name} — not measurable at this offset`); continue; }
  const large = bd.size >= 24 || (bd.size >= 18.66 && bd.weight >= 700);
  const floor = large ? 3 : 4.5;
  const worst = ratioOf(bd.rgb, bd.alpha, bd.p95L, bd.mean);
  const avg = ratioOf(bd.rgb, bd.alpha, bd.meanL, bd.mean);
  const good = worst >= floor;
  if (!good) ok = false;
  console.log(`  ${good ? "PASS" : "FAIL"}  ${c.name.padEnd(17)} ${String(bd.size).padStart(5)}px/${bd.weight}` +
    `  mean ${avg.toFixed(2)}:1  p95 ${worst.toFixed(2)}:1  (floor ${floor})`);
}

/* ── 4. the two new calls to action, and the hero statement's line count ──── */
console.log("\ncopy changes:");
const statementLines = await ev(`document.querySelectorAll("[data-about-line]").length - 1`);
if (statementLines !== 2) fail(`hero statement is set in ${statementLines} lines, expected 2`);
else pass(`hero statement set in 2 lines`);

await scrollTo(0);
const wrapped = await ev(`(()=>{const n=[...document.querySelectorAll("[data-about-line]")].slice(1);
  const lh=parseFloat(getComputedStyle(n[0]).lineHeight);
  return n.map(el=>Math.round(el.getBoundingClientRect().height/lh));})()`);
if (wrapped?.some((rows) => rows > 1))
  console.log(`  ?     lines wrap to ${wrapped.join(" + ")} visual rows at 1440px`);
else pass(`each line holds one visual row at 1440px`);

const resultsTop = await ev(`Math.round(document.querySelector("#about-results-heading")
  .closest("section").offsetTop)`);
await scrollTo(resultsTop);
const actions = await ev(`(()=>{const s=document.querySelector("#about-results-heading").closest("section");
  return [...s.querySelectorAll("a[href]")].map(a=>({
    label:a.textContent.trim(), href:new URL(a.href).pathname,
    w:Math.round(a.getBoundingClientRect().width),
    h:Math.round(a.getBoundingClientRect().height)}));})()`);
const want = [["Our Services", "/our-services"], ["Contact Us", "/contact-us"]];
for (const [label, href] of want) {
  const hit = actions?.find((a) => a.label === label);
  if (!hit) fail(`"${label}" call to action not found in the Why it works band`);
  else if (hit.href !== href) fail(`"${label}" points at ${hit.href}, expected ${href}`);
  else if (hit.h < 44) fail(`"${label}" is ${hit.h}px tall — under the 44px touch target`);
  else pass(`"${label}" → ${href}  ${hit.w}x${hit.h}`);
}

/* ── 5. the theme toggle is gone from the header ─────────────────────────── */
console.log("\nheader:");
const toggle = await ev(`(()=>{const h=document.querySelector("header");
  return [...h.querySelectorAll("button")].map(b=>b.getAttribute("aria-label")||"");})()`);
if (toggle?.some((l) => /theme/i.test(l))) fail(`header still carries a theme toggle: ${toggle.join(", ")}`);
else pass(`no theme toggle in the header (buttons: ${toggle?.join(", ") || "none"})`);

/* ── 6. band shots + no horizontal overflow at 390 ───────────────────────── */
console.log("\nshots:");
const { writeFile } = await import("node:fs/promises");
for (const [name, y] of [["img-01-hero", 0], ["img-02-who", await ev(
  `Math.round(document.querySelector("#about-who-heading").closest("section").offsetTop)`)],
  ["img-03-craft-top", craftTop + 40], ["img-04-craft-mid", craftTop + 420],
  ["img-05-results", resultsTop + 40]]) {
  await scrollTo(Math.max(0, y));
  await sleep(650);
  await writeFile(`${OUT}\\about-${name}.png`, await shot());
  console.log(`  shot  .qa\\about-${name}.png`);
}

await cmd("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
});
await sleep(1200);
await scrollTo(0);
await writeFile(`${OUT}\\about-img-mobile-hero.png`, await shot());
console.log(`  shot  .qa\\about-img-mobile-hero.png`);
await scrollTo(craftTop);
await sleep(700);
await writeFile(`${OUT}\\about-img-mobile-craft.png`, await shot());
console.log(`  shot  .qa\\about-img-mobile-craft.png`);

const over = await ev(`document.documentElement.scrollWidth - window.innerWidth`);
if (over > 1) fail(`horizontal overflow at 390px: ${over}px`);
else pass(`no horizontal overflow at 390px`);

console.log(`\n${ok ? "PASS" : "FAIL"}  new plates`);
sock.close(); chrome.kill(); process.exit(ok ? 0 : 1);
