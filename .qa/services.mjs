/* Our Services page QA: does every plate load, do the six cards land, is the
   pinned band genuinely pinned, and does the copy clear AA over photography?

   Contrast is measured off rendered pixels rather than computed from a token —
   the bands are photographs, so the backdrop behind a line of type is whatever
   the frame happens to put there. Usage: node .qa/services.mjs */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9441", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-services`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9441/json/list")).json();
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
/* Headless defaults to `prefers-reduced-motion: reduce`, which short-circuits
   every reveal on the page — without this the whole run measures a static
   fallback and reports nothing useful about the animations. */
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/our-services" });
await sleep(9000);

const scrollTo = async (y) => {
  await ev(`(()=>{const l=window.__lenis;
    if(l&&l.scrollTo) l.scrollTo(${y},{immediate:true}); else window.scrollTo(0,${y});})()`);
  await sleep(950);
};
const topOf = (sel) =>
  ev(`Math.round(document.querySelector(${JSON.stringify(sel)}).closest("section").offsetTop)`);

let ok = true;
const fail = (m) => { ok = false; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  PASS  ${m}`);

/* ── 1. content is verbatim, and in the legacy page's order ──────────────── */
console.log("\ncontent flow:");
const flow = await ev(`[...document.querySelectorAll("main h1,main h2,main h3")]
  .map(h=>h.tagName+" "+h.textContent.trim())`);
const wantFlow = [
  "H1 Work & Services",
  "H2 WHAT WE DO?",
  "H3 Corporate Documentary",
  "H3 PHOTOGRAPHY",
  "H3 STUDIO FOR RENT",
  "H3 Creative Strategy",
  "H3 Video Production",
  "H3 Digital Advertising",
  "H2 \u201CWE TRANSFORM DREAMS INTO REALITY\u201D",
  "H2 \u201CDocumentaries Make For Great Marketing Tools\u201D",
];
const got = (flow || []).slice(0, wantFlow.length);
for (let i = 0; i < wantFlow.length; i++) {
  if (got[i] !== wantFlow[i]) fail(`position ${i}: got "${got[i]}", expected "${wantFlow[i]}"`);
}
if (got.join("|") === wantFlow.join("|")) pass(`hero → grid → six services → both bands, in order`);

/* The three copy quirks the client's own source carries. Silently "fixing" any
   of them would be a content change, so they are asserted rather than trusted. */
const body = await ev(`document.querySelector("main").innerText`);
for (const [what, needle] of [
  ["\"potraits\" kept as written", "potraits"],
  ["Digital Advertising opens lower-case", "specializes in providing marketing"],
  ["curly quotes kept on both band headings", "\u201CWE TRANSFORM DREAMS INTO REALITY\u201D"],
]) {
  if (body?.includes(needle)) pass(what);
  else fail(`${what} — "${needle}" not found in the rendered page`);
}

/* ── 2. every photograph decoded ─────────────────────────────────────────── */
console.log("\nimagery:");
const gridTop = await topOf("#services-grid-heading");
const dreamsTop = await topOf("#services-dreams-heading");
const docTop = await topOf("#services-documentary-heading");
/* Walked down the page first: next/image lazy-loads, so anything read at scroll
   0 reports naturalWidth 0 and looks like a broken asset when it is only a
   plate that has not been asked for yet. */
for (const y of [gridTop, gridTop + 900, dreamsTop + 200, docTop + 200]) await scrollTo(y);
await sleep(1400);
await scrollTo(0);

const imgs = await ev(`[...document.querySelectorAll("main img")].map(i=>({
  src:decodeURIComponent(i.currentSrc||i.src).replace(/^.*?url=/,"").split("&")[0],
  w:i.naturalWidth,h:i.naturalHeight,alt:i.alt}))`);
const wantImgs = ["hero.jpg", "documentary.jpg", "photography.jpg", "studio.jpg",
  "strategy.jpg", "video.jpg", "advertising.jpg", "band-dreams.jpg", "band-documentary.jpg"];
for (const name of wantImgs) {
  const hit = (imgs || []).find((i) => decodeURIComponent(i.src).includes(`/services/${name}`));
  if (!hit) fail(`${name} — no <img> on the page points at it`);
  else if (!hit.w) fail(`${name} — did not decode`);
  else pass(`${name.padEnd(22)} decoded ${hit.w}x${hit.h}`);
}
/* The six cards are content, so each still must carry a real alt; the two band
   plates are decoration and must carry an empty one. */
const cardAlts = (imgs || []).filter((i) => /\/services\/(documentary|photography|studio|strategy|video|advertising)\.jpg/.test(decodeURIComponent(i.src)));
if (cardAlts.length !== 6) fail(`expected 6 card stills, found ${cardAlts.length}`);
else if (cardAlts.some((i) => !i.alt || i.alt.length < 12)) fail(`a card still has no descriptive alt`);
else pass(`all 6 card stills carry a descriptive alt`);
const plateAlts = (imgs || []).filter((i) => /band-(dreams|documentary)\.jpg/.test(decodeURIComponent(i.src)));
if (plateAlts.some((i) => i.alt !== "")) fail(`a decorative band plate carries a non-empty alt`);
else pass(`both band plates are alt="" (decorative)`);

/* ── 3. the six cards laid out, and the hero index reaches them ──────────── */
console.log("\ngrid:");
await scrollTo(gridTop + 200);
const cards = await ev(`[...document.querySelectorAll("[data-svc-card]")].map(c=>{
  const r=c.getBoundingClientRect(), cs=getComputedStyle(c);
  return {id:c.id, w:Math.round(r.width), h:Math.round(r.height),
          top:Math.round(r.top), op:parseFloat(cs.opacity)};})`);
if (cards?.length !== 6) fail(`expected 6 cards, rendered ${cards?.length}`);
else pass(`6 cards rendered`);
const rows = [...new Set((cards || []).map((c) => c.top))].sort((a, b) => a - b);
if (rows.length !== 2) console.log(`  ?     cards fall on ${rows.length} rows at 1440px (expected 2)`);
else pass(`3 x 2 grid at 1440px`);
if ((cards || []).some((c) => c.op < 0.99)) fail(`a card is still mid-reveal at opacity < 1 after scrolling to it`);
else pass(`every card reveals to full opacity`);
const heights = (cards || []).map((c) => c.h);
const spread = Math.max(...heights) - Math.min(...heights);
if (rows.length === 2) {
  const perRow = rows.map((t) => (cards || []).filter((c) => c.top === t).map((c) => c.h));
  const ragged = perRow.some((hs) => Math.max(...hs) - Math.min(...hs) > 1);
  if (ragged) fail(`cards in a row are not the same height: ${perRow.map((h) => h.join("/")).join("  ")}`);
  else pass(`cards match height within each row (spread across rows ${spread}px)`);
}

const index = await ev(`(()=>{const ids=[...document.querySelectorAll("[data-svc-card]")].map(c=>c.id);
  const links=[...document.querySelectorAll('a[href^="#service-"]')];
  return {n:links.length, missing:links.map(a=>a.getAttribute("href").slice(1)).filter(h=>!ids.includes(h)),
          labels:links.map(a=>a.textContent.trim())};})()`);
if (index?.n !== 6) fail(`hero index has ${index?.n} links, expected 6`);
else if (index.missing.length) fail(`hero index points at missing cards: ${index.missing.join(", ")}`);
else pass(`hero index: 6 links, every one resolves to a card`);

/* ── 4. the pinned band is pinned, not drifting ──────────────────────────── */
console.log("\n\u201CWE TRANSFORM DREAMS\u201D plate pinned to the viewport:");
const probe = `(()=>{const s=document.querySelector("#services-dreams-heading").closest("section");
  const p=s.querySelector("img").closest("div");
  const cs=getComputedStyle(p), r=p.getBoundingClientRect();
  return {pos:cs.position, tf:cs.transform, top:Math.round(r.top),
          clip:getComputedStyle(s).clipPath};})()`;
await scrollTo(dreamsTop + 60);
const a = await ev(probe);
await scrollTo(dreamsTop + 420);
const b = await ev(probe);
if (a.pos !== "fixed") fail(`plate position is ${a.pos}, expected fixed`);
else pass(`position: fixed`);
if (a.tf !== "none") fail(`plate carries transform ${a.tf} — a transform makes it a containing block`);
else pass(`transform: none`);
if (a.top !== b.top) fail(`plate moved ${a.top} → ${b.top} across 360px of scroll`);
else pass(`viewport top steady at ${a.top} across 360px of scroll`);
if (!/inset|rect|polygon/.test(a.clip)) fail(`section clip-path is "${a.clip}" — a fixed child will not be trimmed`);
else pass(`section clip-path trims it back to the band`);

/* ── 5. contrast, sampled from rendered pixels ───────────────────────────── */
const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

async function backdrop(rectSel) {
  const geo = await ev(`(()=>{const el=document.querySelector(${JSON.stringify(rectSel)});
    if(!el) return null; const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
    /* Tailwind v4 emits \`text-white/70\` as oklab(...), and pulling the numbers
       out of that string with a regex reads near-white as near-black. Resolve it
       on canvas instead: paint the colour over black and over white, solve
       a = 1 - (onWhite - onBlack)/255, then C = onBlack / a. */
    const read=(bg)=>{const cv=document.createElement("canvas");cv.width=cv.height=1;
      const x=cv.getContext("2d");x.fillStyle=bg;x.fillRect(0,0,1,1);
      x.fillStyle=cs.color;x.fillRect(0,0,1,1);return x.getImageData(0,0,1,1).data;};
    const bk=read("#000"), wh=read("#fff");
    const al=1-(wh[0]-bk[0])/255;
    const rgb=al<=0.001?[0,0,0]:[bk[0]/al,bk[1]/al,bk[2]/al];
    return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
            rad:parseFloat(cs.borderRadius)||0,
            rgb,alpha:al,size:parseFloat(cs.fontSize),weight:parseInt(cs.fontWeight,10)||400};})()`);
  if (!geo || geo.w < 4 || geo.h < 4) return null;

  /* Blank the glyphs rather than hiding the element. `visibility: hidden` takes
     the element's own plate away with its text, so the index chip's 72%-black
     backing was measured against the bare photograph behind it — a backdrop no
     glyph is ever drawn on. Setting every colour in the subtree to transparent
     leaves border, background and blur exactly where they are. */
  const blank = (on) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(rectSel)});
    if(!el) return; [el,...el.querySelectorAll("*")].forEach(n=>{
      if(${on}){ n.dataset.qaC=n.style.color||"\\u0000";
        n.style.setProperty("color","transparent","important");
        n.style.setProperty("-webkit-text-fill-color","transparent","important"); }
      else { n.style.removeProperty("color"); n.style.removeProperty("-webkit-text-fill-color");
        if(n.dataset.qaC && n.dataset.qaC!=="\\u0000") n.style.color=n.dataset.qaC;
        delete n.dataset.qaC; }});})()`);

  await blank(true);
  await sleep(260);
  const png = await shot();
  await blank(false);

  const meta = await sharp(png).metadata();
  const scale = meta.width / 1440;
  /* A rounded pill's bounding box includes four corners that lie outside the
     shape, so they show the raw photograph rather than the element's own plate.
     No glyph ever sits there, and on a short chip those corners are ~4% of the
     box — enough to own the 95th percentile and report a failure that is not
     one. Inset by the corner radius so the sample is the region the text
     actually sits on. Square elements are unaffected (radius 0). */
  const pad = Math.min(geo.rad, geo.h / 2);
  const left = Math.max(0, Math.round((geo.x + pad) * scale));
  const top = Math.max(0, Math.round((geo.y + 1) * scale));
  const width = Math.min(meta.width - left, Math.round((geo.w - 2 * pad) * scale));
  const height = Math.min(meta.height - top, Math.round((geo.h - 2) * scale));
  if (width < 2 || height < 2) return null;

  const crop = sharp(png).extract({ left, top, width, height });
  const { data, info } = await crop.clone().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const lums = [];
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let i = 0; i < data.length; i += ch) {
    sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++;
    lums.push(L(data[i], data[i + 1], data[i + 2]));
  }
  lums.sort((p, q) => p - q);
  return { ...geo, crop, mean: { r: sr / n, g: sg / n, b: sb / n },
    meanL: L(sr / n, sg / n, sb / n), p95L: lums[Math.floor(lums.length * 0.95)] };
}

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
  { name: "hero h1 (gold)", y: 0, rect: "#services-hero-heading" },
  { name: "hero index chip", y: 0, rect: 'a[href^="#service-"]' },
  { name: "card heading", y: gridTop + 260, rect: "#service-photography h3" },
  { name: "card body", y: gridTop + 260, rect: "#service-photography p" },
  { name: "dreams h2 @top", y: dreamsTop + 60, rect: "#services-dreams-heading" },
  { name: "dreams body @top", y: dreamsTop + 60, rect: "#services-dreams-heading ~ p" },
  { name: "dreams h2 @mid", y: dreamsTop + 400, rect: "#services-dreams-heading" },
  { name: "doc h2", y: docTop + 60, rect: "#services-documentary-heading" },
  { name: "doc body", y: docTop + 60, rect: "#services-documentary-heading ~ p" },
];

console.log("\ncopy over photography (backdrop sampled from rendered pixels):");
for (const c of cases) {
  await scrollTo(c.y);
  const bd = await backdrop(c.rect);
  if (!bd) { console.log(`  ?     ${c.name} — not measurable at this offset`); continue; }
  const large = bd.size >= 24 || (bd.size >= 18.66 && bd.weight >= 700);
  const floor = large ? 3 : 4.5;
  const worst = ratioOf(bd.rgb, bd.alpha, bd.p95L, bd.mean);
  const avg = ratioOf(bd.rgb, bd.alpha, bd.meanL, bd.mean);
  const good = worst >= floor;
  if (!good) {
    ok = false;
    /* Keep the exact pixels a failure was read from — the difference between a
       real contrast defect and a mis-aimed crop is only visible by looking. */
    const file = `${OUT}\\services-x-${c.name.replace(/\W+/g, "-")}.png`;
    await bd.crop.png().toFile(file);
    console.log(`        sampled region written to ${file}`);
  }
  console.log(`  ${good ? "PASS" : "FAIL"}  ${c.name.padEnd(18)} ${String(bd.size).padStart(5)}px/${bd.weight}` +
    `  mean ${avg.toFixed(2)}:1  p95 ${worst.toFixed(2)}:1  (floor ${floor})`);
}

/* ── 6. the closing calls to action ──────────────────────────────────────── */
console.log("\ncalls to action:");
await scrollTo(docTop);
const actions = await ev(`(()=>{const s=document.querySelector("#services-documentary-heading").closest("section");
  return [...s.querySelectorAll("a[href]")].map(a=>({label:a.textContent.trim(),
    href:new URL(a.href).pathname, w:Math.round(a.getBoundingClientRect().width),
    h:Math.round(a.getBoundingClientRect().height)}));})()`);
for (const [label, href] of [["Our Projects", "/our-projects"], ["Contact Us", "/contact-us"]]) {
  const hit = actions?.find((x) => x.label === label);
  if (!hit) fail(`"${label}" call to action not found`);
  else if (hit.href !== href) fail(`"${label}" points at ${hit.href}, expected ${href}`);
  else if (hit.h < 44) fail(`"${label}" is ${hit.h}px tall — under the 44px touch target`);
  else pass(`"${label}" → ${href}  ${hit.w}x${hit.h}`);
}

/* ── 7. shots, then mobile ───────────────────────────────────────────────── */
console.log("\nshots:");
for (const [name, y] of [["01-hero", 0], ["02-grid", gridTop + 120], ["03-grid-row2", gridTop + 900],
  ["04-dreams", dreamsTop + 40], ["05-dreams-mid", dreamsTop + 420], ["06-documentary", docTop + 40]]) {
  await scrollTo(Math.max(0, y));
  await sleep(700);
  await writeFile(`${OUT}\\services-${name}.png`, await shot());
  console.log(`  shot  .qa\\services-${name}.png`);
}

/* Hover state, captured on a real pointer move so the bloom's custom properties
   are actually set — a synthetic class toggle would not exercise them. */
await scrollTo(gridTop + 260);
const box = await ev(`(()=>{const r=document.querySelector("#service-photography").getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};})()`);
await cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y, buttons: 0 });
await sleep(1400);
await writeFile(`${OUT}\\services-07-card-hover.png`, await shot());
console.log(`  shot  .qa\\services-07-card-hover.png`);
const glow = await ev(`(()=>{const c=document.querySelector("#service-photography");
  return {mx:c.style.getPropertyValue("--mx"), my:c.style.getPropertyValue("--my")};})()`);
if (!glow?.mx) fail(`pointer bloom did not set --mx on hover`);
else pass(`pointer bloom tracks at --mx ${glow.mx} / --my ${glow.my}`);

await cmd("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
});
await sleep(1400);
await scrollTo(0);
await writeFile(`${OUT}\\services-mobile-hero.png`, await shot());
await scrollTo(await topOf("#services-grid-heading"));
await sleep(800);
await writeFile(`${OUT}\\services-mobile-grid.png`, await shot());
console.log(`  shot  .qa\\services-mobile-hero.png, .qa\\services-mobile-grid.png`);

const over = await ev(`document.documentElement.scrollWidth - window.innerWidth`);
if (over > 1) fail(`horizontal overflow at 390px: ${over}px`);
else pass(`no horizontal overflow at 390px`);

console.log(`\n${ok ? "PASS" : "FAIL"}  Our Services`);
sock.close(); chrome.kill(); process.exit(ok ? 0 : 1);
