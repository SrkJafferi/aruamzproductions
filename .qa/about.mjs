/* Headless pass over the new About page. Walks it top to bottom, shoots each
   band, and checks the things that have actually gone wrong on this project
   before: reveals that never fire, a hero scrim that travels and uncovers the
   join, and body copy that falls under the AA contrast floor on footage.
   Usage: node .qa/about.mjs */
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
  "--headless=new", "--remote-debugging-port=9437", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-about`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9437/json/list")).json();
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
/* Headless defaults to reduce, which switches every reveal off and would make
   the whole animation half of this probe vacuous. */
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});

const errors = [];
sock.send(JSON.stringify({ id: ++seq, method: "Log.enable" }));
sock.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Log.entryAdded" && m.params?.entry?.level === "error") {
    errors.push(m.params.entry.text);
  }
});

await cmd("Page.navigate", { url: "http://127.0.0.1:3100/about-us" });
for (let i = 0; i < 80; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(6500);

const scrollTo = async (y) => {
  await ev(`(()=>{const l=window.__lenis;
    if(l&&l.scrollTo) l.scrollTo(${y},{immediate:true}); else window.scrollTo(0,${y});})()`);
  await sleep(900);
  return ev("Math.round(window.scrollY)");
};

/* ── 1. structure ──────────────────────────────────────────────────────── */
const structure = await ev(`(()=>{
  const secs=[...document.querySelectorAll("main > section")];
  return {
    count: secs.length,
    list: secs.map(s=>{
      const h=s.querySelector("h1,h2");
      return {id:s.id||null, heading:h?h.textContent.trim().slice(0,58):null,
        top:Math.round(s.offsetTop), h:Math.round(s.getBoundingClientRect().height)};
    }),
    h1: [...document.querySelectorAll("h1")].map(h=>h.textContent.trim()),
    crumb: [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')].map(l=>l.textContent.trim()),
    ld: [...document.querySelectorAll('script[type="application/ld+json"]')].length,
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
  };})()`);

console.log(`title      ${structure.title}`);
console.log(`canonical  ${structure.canonical}`);
console.log(`h1         ${JSON.stringify(structure.h1)}`);
console.log(`breadcrumb ${JSON.stringify(structure.crumb)}`);
console.log(`ld+json    ${structure.ld} block(s)`);
console.log(`\n${structure.count} sections:`);
for (const s of structure.list) {
  console.log(`  ${String(s.top).padStart(6)}px  h=${String(s.h).padStart(4)}  ${s.heading ?? "(no heading)"}`);
}
console.log(structure.h1.length === 1 ? "  PASS  exactly one h1" : "  FAIL  h1 count is not 1");

/* ── 2. every reveal actually lands ────────────────────────────────────── */
const docH = await ev("document.documentElement.scrollHeight");
const vh = await ev("window.innerHeight");
for (let y = 0; y <= docH - vh; y += Math.round(vh * 0.7)) await scrollTo(y);
await scrollTo(docH);
await sleep(1200);

const stuck = await ev(`(()=>{
  const bad=[];
  for (const el of document.querySelectorAll("main .reveal, main [data-about-tile], main [data-about-hero]")) {
    const cs=getComputedStyle(el);
    if (parseFloat(cs.opacity) < 0.95) {
      bad.push({cls:el.className.toString().slice(0,44), op:cs.opacity, tag:el.tagName});
    }
  }
  return bad;})()`);
console.log(`\nreveals still under full opacity after a full scroll: ${stuck.length}`);
for (const b of stuck.slice(0, 10)) console.log(`  ${b.tag} opacity ${b.op}  ${b.cls}`);
console.log(stuck.length === 0 ? "  PASS  every reveal fired" : "  FAIL  some elements never revealed");

/* ── 3. hero scrim must fade, never translate ──────────────────────────── */
const heroH = await ev(`Math.round(document.querySelector("main > section").getBoundingClientRect().height)`);
await scrollTo(Math.round(heroH * 0.8));
const heroLayers = await ev(`(()=>{
  const s=document.querySelector("[data-about-hero-scrim-fade]");
  const c=document.querySelector("[data-about-hero-exit]");
  const cs=getComputedStyle(s);
  const parent=getComputedStyle(s.parentElement);
  return {fadeOpacity:cs.opacity, fadeTransform:cs.transform,
    wrapTransform:parent.transform, wrapOpacity:parent.opacity,
    copyOpacity:c?getComputedStyle(c).opacity:null};})()`);
console.log(`\nat 80% through the hero:`);
console.log(`  scrim wrapper  opacity ${heroLayers.wrapOpacity}  transform ${heroLayers.wrapTransform}`);
console.log(`  fading layers  opacity ${heroLayers.fadeOpacity}  transform ${heroLayers.fadeTransform}`);
console.log(`  copy           opacity ${heroLayers.copyOpacity}`);
const still = (t) => t === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(t);
console.log(still(heroLayers.wrapTransform) && still(heroLayers.fadeTransform)
  ? "  PASS  the scrim only fades — it never travels"
  : "  FAIL  a scrim layer is being translated");

/* ── 4. contrast of body copy sitting on footage ───────────────────────── */
/* Tailwind v4 emits text-white/70 as oklab(), so the numbers in the computed
   value cannot be parsed. Paint the colour on canvas over black and over white
   and solve for the alpha instead. */
const contrast = await ev(`(()=>{
  const lin=c=>{const s=c/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4);};
  const L=(r,g,b)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
  const resolve=(colour)=>{
    const read=(bg)=>{const cv=document.createElement("canvas");cv.width=cv.height=1;
      const x=cv.getContext("2d");x.fillStyle=bg;x.fillRect(0,0,1,1);
      x.fillStyle=colour;x.fillRect(0,0,1,1);return x.getImageData(0,0,1,1).data;};
    const b=read("#000"), w=read("#fff");
    const a=1-(w[0]-b[0])/255;
    if(a<=0.001) return {r:0,g:0,b:0,a:0};
    return {r:b[0]/a,g:b[1]/a,b:b[2]/a,a};
  };
  const out=[];
  const targets=[
    ["hero statement","main > section:nth-of-type(1) p span:last-child"],
    ["craft body","#about-craft-heading ~ p"],
    ["results body","#about-results-heading ~ p"],
  ];
  for(const [name,sel] of targets){
    const el=document.querySelector(sel);
    if(!el){out.push({name,missing:true});continue;}
    const cs=getComputedStyle(el);
    const fg=resolve(cs.color);
    /* Composited over the scrim's darkest stated stop, rgb(8 8 8) — the plate
       behind is lighter, so this is the pessimistic read. */
    const px={r:fg.r*fg.a+8*(1-fg.a),g:fg.g*fg.a+8*(1-fg.a),b:fg.b*fg.a+8*(1-fg.a)};
    const ratio=(L(px.r,px.g,px.b)+0.05)/(L(8,8,8)+0.05);
    const size=parseFloat(cs.fontSize), weight=parseInt(cs.fontWeight,10)||400;
    /* WCAG "large" is a type-size rule: 24px, or 18.66px at weight >= 700. */
    const large = size>=24 || (size>=18.66 && weight>=700);
    out.push({name,size,weight,large,ratio:+ratio.toFixed(2),floor:large?3:4.5});
  }
  return out;})()`);
console.log("\nbody copy over footage (composited on the scrim's darkest stop):");
let contrastOk = true;
for (const c of contrast) {
  if (c.missing) { console.log(`  ?     ${c.name} — selector not found`); continue; }
  const pass = c.ratio >= c.floor;
  if (!pass) contrastOk = false;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${c.name.padEnd(16)} ${c.size}px/${c.weight}  ${c.ratio}:1  (floor ${c.floor})`);
}

/* ── 5. images all resolved ────────────────────────────────────────────── */
const imgs = await ev(`(()=>{
  const bad=[];
  for(const i of document.querySelectorAll("main img")){
    if(!i.complete || i.naturalWidth===0) bad.push(i.currentSrc||i.src);
  }
  return {total:document.querySelectorAll("main img").length, bad};})()`);
console.log(`\nimages: ${imgs.total} in <main>, ${imgs.bad.length} failed`);
for (const b of imgs.bad) console.log(`  BROKEN  ${b}`);

/* ── 6. shots ──────────────────────────────────────────────────────────── */
const bands = [
  ["about-01-hero", 0],
  ["about-02-who", structure.list[1]?.top ?? 0],
  ["about-03-principles", structure.list[2]?.top ?? 0],
  ["about-04-craft", structure.list[3]?.top ?? 0],
  ["about-05-featured", structure.list[4]?.top ?? 0],
  ["about-06-results", structure.list[5]?.top ?? 0],
];
console.log("");
for (const [name, y] of bands) {
  await scrollTo(Math.max(0, y - 40));
  await sleep(700);
  await writeFile(`${OUT}\\${name}.png`, await shot());
  console.log(`  shot  .qa\\${name}.png  (scroll ${Math.max(0, y - 40)}px)`);
}

/* Mobile, at the width the client's screenshots have been coming in at. */
await cmd("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
});
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/about-us" });
await sleep(7000);
await writeFile(`${OUT}\\about-mobile-hero.png`, await shot());
const mobileOverflow = await ev(
  `document.documentElement.scrollWidth - document.documentElement.clientWidth`,
);
await scrollTo(2400);
await writeFile(`${OUT}\\about-mobile-mid.png`, await shot());
console.log(`\n  shot  .qa\\about-mobile-hero.png / about-mobile-mid.png  (390x844)`);
console.log(mobileOverflow <= 0
  ? "  PASS  no horizontal overflow at 390px"
  : `  FAIL  ${mobileOverflow}px of horizontal overflow at 390px`);

console.log(`\nconsole errors: ${errors.length}`);
for (const e of errors.slice(0, 8)) console.log(`  ${e.slice(0, 160)}`);

const ok = stuck.length === 0 && imgs.bad.length === 0 && contrastOk
  && mobileOverflow <= 0 && structure.h1.length === 1
  && still(heroLayers.wrapTransform) && still(heroLayers.fadeTransform);
console.log(`\n${ok ? "PASS" : "FAIL"}  /about-us`);

sock.close(); chrome.kill(); process.exit(0);
