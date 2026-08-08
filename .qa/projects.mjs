/* Our Projects page QA: the two lines of copy, all 48 stills, the masonry, the
   lightbox, and whether gold type clears AA over a lit warehouse plate.

   Contrast is measured off rendered pixels rather than computed from a token —
   the hero is a photograph, so the backdrop behind a line of type is whatever
   the frame happens to put there. Usage: node .qa/projects.mjs */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9442", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-projects`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9442/json/list")).json();
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
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/our-projects" });
await sleep(9000);

const scrollTo = async (y) => {
  await ev(`(()=>{const l=window.__lenis;
    if(l&&l.scrollTo) l.scrollTo(${y},{immediate:true}); else window.scrollTo(0,${y});})()`);
  await sleep(900);
};

let ok = true;
const fail = (m) => { ok = false; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  PASS  ${m}`);

/* ── 1. the page carries exactly the legacy page's copy ──────────────────── */
console.log("\ncontent flow:");
const flow = await ev(`[...document.querySelectorAll("main h1,main h2")]
  .map(h=>h.tagName+" "+h.textContent.trim())`);
const wantHead = ["H1 Our Projects", "H2 WHAT WE HAVE DONE?"];
const got = (flow || []).slice(0, 2);
if (got.join("|") !== wantHead.join("|")) fail(`heading flow is ${JSON.stringify(got)}, expected ${JSON.stringify(wantHead)}`);
else pass(`H1 "Our Projects" → H2 "WHAT WE HAVE DONE?"`);
/* The legacy page's remaining sections, in its order. */
const rest = (flow || []).slice(2).join(" | ");
for (const needle of ["Company Facts", "WHAT THEY SAY", "Subscribe for our newsletter"]) {
  if (rest.toLowerCase().includes(needle.toLowerCase())) pass(`"${needle}" section present, after the gallery`);
  else fail(`"${needle}" section missing — legacy flow is gallery → facts → testimonials → newsletter`);
}

const galleryTop = await ev(`Math.round(document.querySelector("#projects-gallery").offsetTop)`);

/* ── 2. all 48 stills ────────────────────────────────────────────────────── */
console.log("\ngallery stills:");
const tiles = await ev(`document.querySelectorAll("[data-prj-tile]").length`);
if (tiles !== 48) fail(`expected 48 tiles, rendered ${tiles}`);
else pass(`48 tiles rendered`);

const alts = await ev(`(()=>{const im=[...document.querySelectorAll("[data-prj-tile] img")];
  return {n:im.length, empty:im.filter(i=>!i.alt).length,
          dup:new Set(im.map(i=>i.getAttribute("src"))).size};})()`);
if (alts?.empty) fail(`${alts.empty} gallery stills have no alt text`);
else pass(`every still carries alt text`);
if (alts?.dup !== 48) fail(`only ${alts?.dup} distinct sources across 48 tiles — a still is repeated`);
else pass(`48 distinct sources, no still repeated`);

/* next/image lazy-loads, so anything read before scrolling to it reports
   naturalWidth 0 and looks like a broken asset. Walk the whole masonry. */
const pageH = await ev(`document.documentElement.scrollHeight`);
for (let y = galleryTop; y < pageH; y += 700) await scrollTo(y);
await sleep(2200);
const decoded = await ev(`(()=>{const im=[...document.querySelectorAll("[data-prj-tile] img")];
  return {ok:im.filter(i=>i.naturalWidth>0).length,
          bad:im.map((i,n)=>[n+1,i.naturalWidth]).filter(p=>!p[1]).map(p=>p[0])};})()`);
if (decoded?.ok !== 48) fail(`${48 - (decoded?.ok ?? 0)} stills did not decode: tiles ${decoded?.bad.join(", ")}`);
else pass(`all 48 stills decoded`);

const revealed = await ev(`[...document.querySelectorAll("[data-prj-tile]")]
  .filter(t=>parseFloat(getComputedStyle(t).opacity)<0.99).length`);
if (revealed) fail(`${revealed} tiles are still mid-reveal at opacity < 1 after scrolling past them`);
else pass(`every tile reveals to full opacity`);

/* ── 3. masonry layout ───────────────────────────────────────────────────── */
console.log("\nmasonry:");
await scrollTo(galleryTop + 400);
const cols = await ev(`(()=>{const t=[...document.querySelectorAll("[data-prj-tile]")];
  const lefts=[...new Set(t.map(x=>Math.round(x.getBoundingClientRect().left)))].sort((a,b)=>a-b);
  const heights=lefts.map(l=>t.filter(x=>Math.round(x.getBoundingClientRect().left)===l).length);
  return {lefts,heights};})()`);
if (cols?.lefts.length !== 3) fail(`masonry falls on ${cols?.lefts.length} columns at 1440px (expected 3)`);
else pass(`3 columns at 1440px, ${cols.heights.join("/")} tiles per column`);
const over = await ev(`document.documentElement.scrollWidth - window.innerWidth`);
if (over > 1) fail(`horizontal overflow at 1440px: ${over}px`);
else pass(`no horizontal overflow at 1440px`);

/* ── 4. the hero's jump link reaches the gallery ─────────────────────────── */
console.log("\nhero call to action:");
const cta = await ev(`(()=>{const a=document.querySelector('a[href="#projects-gallery"]');
  if(!a) return null; const r=a.getBoundingClientRect();
  return {label:a.textContent.trim(), h:Math.round(r.height), w:Math.round(r.width),
          target:!!document.querySelector("#projects-gallery")};})()`);
if (!cta) fail(`hero has no link to the gallery`);
else {
  if (!cta.target) fail(`hero link points at #projects-gallery, which does not exist`);
  else pass(`"${cta.label}" → #projects-gallery  ${cta.w}x${cta.h}`);
  if (cta.h < 44) fail(`hero link is ${cta.h}px tall — under the 44px touch target`);
  else pass(`hero link clears the 44px touch target`);
  if (!/\b48\b/.test(cta.label)) fail(`hero link says "${cta.label}" — the count should be read from the gallery`);
  else pass(`hero link counts the gallery itself`);
}

/* ── 5. the lightbox ─────────────────────────────────────────────────────── */
console.log("\nlightbox:");
await scrollTo(galleryTop + 400);
const box = await ev(`(()=>{const r=document.querySelectorAll("[data-prj-tile]")[1].getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+Math.min(r.height/2,300))};})()`);
for (const type of ["mousePressed", "mouseReleased"]) {
  await cmd("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
}
await sleep(1200);
const open1 = await ev(`(()=>{const d=document.querySelector('[role="dialog"]');
  if(!d) return null; return {label:d.getAttribute("aria-label"),
    src:d.querySelector("img")?.getAttribute("src")||"", locked:document.body.style.overflow};})()`);
if (!open1) fail(`clicking a tile did not open the viewer`);
else {
  pass(`viewer opens: ${open1.label}`);
  if (open1.locked !== "hidden") fail(`background scroll is not locked while the viewer is open`);
  else pass(`background scroll locked`);
}
await writeFile(`${OUT}\\projects-05-lightbox.png`, await shot());

await cmd("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
await cmd("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
await sleep(900);
const open2 = await ev(`document.querySelector('[role="dialog"]')?.getAttribute("aria-label")`);
if (open2 && open1 && open2 !== open1.label) pass(`ArrowRight advances: ${open1.label} → ${open2}`);
else fail(`ArrowRight did not advance the viewer (still "${open2}")`);

await cmd("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
await cmd("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
await sleep(900);
const closed = await ev(`(()=>({open:!!document.querySelector('[role="dialog"]'),
  locked:document.body.style.overflow}))()`);
if (closed?.open) fail(`Escape did not close the viewer`);
else pass(`Escape closes the viewer`);
if (closed?.locked === "hidden") fail(`scroll lock was not released on close`);
else pass(`scroll lock released on close`);

/* ── 6. contrast, sampled from rendered pixels ───────────────────────────── */
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
     the element's own plate away with its text, so the hero's 72%-black CTA was
     measured against the bare photograph behind it — a backdrop no glyph is ever
     drawn on. Setting every colour in the subtree to transparent leaves border,
     background and blur exactly where they are. */
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
  { name: "hero h1 (gold)", y: 0, rect: "#projects-hero-heading" },
  { name: "hero breadcrumb", y: 0, rect: "[data-prj-crumb] a" },
  { name: "hero cta", y: 0, rect: 'a[href="#projects-gallery"]' },
  { name: "gallery h2", y: galleryTop - 60, rect: "#projects-gallery-heading" },
  { name: "gallery eyebrow", y: galleryTop - 60, rect: "[data-prj-head] .eyebrow" },
  { name: "gallery count label", y: galleryTop - 60, rect: "[data-prj-head] p.reveal.font-mono span:last-child" },
];

console.log("\ncopy over its backdrop (sampled from rendered pixels):");
for (const c of cases) {
  await scrollTo(Math.max(0, c.y));
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
    const file = `${OUT}\\projects-x-${c.name.replace(/\W+/g, "-")}.png`;
    await bd.crop.png().toFile(file);
    console.log(`        sampled region written to ${file}`);
  }
  console.log(`  ${good ? "PASS" : "FAIL"}  ${c.name.padEnd(20)} ${String(bd.size).padStart(5)}px/${bd.weight}` +
    `  mean ${avg.toFixed(2)}:1  p95 ${worst.toFixed(2)}:1  (floor ${floor})`);
}

/* ── 7. shots, then mobile ───────────────────────────────────────────────── */
console.log("\nshots:");
for (const [name, y] of [["01-hero", 0], ["02-gallery-head", galleryTop - 80],
  ["03-masonry", galleryTop + 700], ["04-masonry-deep", galleryTop + 3200]]) {
  await scrollTo(Math.max(0, y));
  await sleep(700);
  await writeFile(`${OUT}\\projects-${name}.png`, await shot());
  console.log(`  shot  .qa\\projects-${name}.png`);
}

await scrollTo(galleryTop + 700);
const hoverBox = await ev(`(()=>{const r=document.querySelectorAll("[data-prj-tile]")[3].getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+Math.min(r.height/2,280))};})()`);
await cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x: hoverBox.x, y: hoverBox.y, buttons: 0 });
await sleep(1300);
await writeFile(`${OUT}\\projects-06-tile-hover.png`, await shot());
console.log(`  shot  .qa\\projects-06-tile-hover.png`);

await cmd("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
});
await sleep(1400);
await scrollTo(0);
await writeFile(`${OUT}\\projects-mobile-hero.png`, await shot());
await scrollTo(await ev(`Math.round(document.querySelector("#projects-gallery").offsetTop)`));
await sleep(900);
await writeFile(`${OUT}\\projects-mobile-gallery.png`, await shot());
console.log(`  shot  .qa\\projects-mobile-hero.png, .qa\\projects-mobile-gallery.png`);

const overM = await ev(`document.documentElement.scrollWidth - window.innerWidth`);
if (overM > 1) fail(`horizontal overflow at 390px: ${overM}px`);
else pass(`no horizontal overflow at 390px`);

console.log(`\n${ok ? "PASS" : "FAIL"}  Our Projects`);
sock.close(); chrome.kill(); process.exit(ok ? 0 : 1);
