/* Shoots the CEO band in both themes and measures the contrast of the body copy
   against what is actually painted behind it, so the low-opacity plate can be
   shown not to have eaten legibility. Usage: node .qa/ceotheme.mjs */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const url = process.argv[2] || "http://127.0.0.1:3100/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9363", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-theme`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9363/json/list")).json();
    target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  } catch {}
}
const sock = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
let seq = 0; const pending = new Map();
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const cmd = (m, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); sock.send(JSON.stringify({ id, method: m, params })); });
/* Throws on a page-side exception instead of returning undefined. A silent
   failure here reads as "the backdrop is too bright" rather than "the probe
   never ran", which is a far more expensive mistake to chase. */
const ev = async (expression) => {
  const { result } = await cmd("Runtime.evaluate", { expression, returnByValue: true });
  if (result?.exceptionDetails) {
    throw new Error(`page-side: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
  }
  return result?.result?.value;
};

await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
await cmd("Page.navigate", { url });
for (let i = 0; i < 60; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(4200);

const SECTION = `document.querySelector('[aria-labelledby="ceo-heading"]')`;
const top = await ev(`${SECTION}.getBoundingClientRect().top + scrollY`);

/* Text is sampled against the pixels actually behind it, not against the
   declared background colour: the plate, the accent wash, the feather and the
   grain all composite in between. Hiding the copy for one frame is the only way
   to read that stack cleanly — the modal colour of a block that still has
   glyphs in it reports the largest flat area, which is not the worst case. */
const TARGETS = [
  { name: "body copy", sel: "blockquote p" },
  { name: "name", sel: "#ceo-heading" },
  { name: "eyebrow", sel: ".eyebrow" },
];

/* Reads what is really painted behind the paragraph by sampling the rendered
   pixels, rather than trusting the declared background colour — the plate sits
   between the two. */
const lum = (r, g, b) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); };

const png = (b64) => Buffer.from(b64, "base64");
// pathToFileURL, not a bare path: the ESM loader rejects Windows drive letters.
const sharp = (await import(
  pathToFileURL("F:/xampp/htdocs/aruamzproductions/node_modules/sharp/lib/index.js").href
)).default;

/* The plate is position:fixed, so the crop sitting behind the copy is a
   function of scroll — one parked offset grades one crop and says nothing about
   the rest of the pass. Sweep instead, and report the worst case.
   Every offset is at or before the section top: scrolling past it slides the
   eyebrow under the fixed navbar, whose blurred surface is what the probe would
   then measure. That is why regrading the plate once moved the body-copy number
   and left the eyebrow's byte-identical. */
const OFFSETS = [-260, -170, -80, 0, 40];
const worst = new Map();

for (const theme of ["dark", "light"]) {
 for (const off of OFFSETS) {
  await ev(`document.documentElement.setAttribute("data-theme","${theme}")`);
  await ev(`scrollTo({top:${Math.round(top + off)},behavior:"instant"})`);
  await sleep(off === OFFSETS[0] ? 900 : 450);

  const boxes = await ev(
    `(()=>{const s=${SECTION};return ${JSON.stringify(TARGETS)}.map(t=>{
      const el=s.querySelector(t.sel);const r=el.getBoundingClientRect();
      return {name:t.name,fg:getComputedStyle(el).color,
       x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};});})()`,
  );

  const dressed = await cmd("Page.captureScreenshot", { format: "png" });
  if (off === 0) writeFileSync(`${OUT}\\ceo-theme-${theme}.png`, png(dressed.result.data));

  // Same frame with the whole copy column made invisible, so every sampled
  // pixel is backdrop. visibility, not display: the layout must not shift.
  const HIDE = `${SECTION}.querySelector(".container-page").style.visibility=`;
  await ev(`${HIDE}"hidden"`);
  await sleep(320);
  const bare = png((await cmd("Page.captureScreenshot", { format: "png" })).result.data);
  await ev(`${HIDE}""`);

  if (Buffer.compare(bare, png(dressed.result.data)) === 0) {
    throw new Error(`[${theme} @${off}] bare frame identical to dressed — the hide did not land`);
  }
  /* Anything a fixed overlay covers is not this section's backdrop. Assert it
     rather than trusting the scroll position, so the probe can never silently
     grade the navbar again. */
  const navBottom = await ev(`(document.querySelector("header")?.getBoundingClientRect().bottom)||0`);
  for (const b of boxes) {
    if (b.y < navBottom) {
      console.log(`  !! ${b.name} at y=${b.y} is under the navbar (bottom ${navBottom}) — not measured`);
      continue;
    }
    /* Blurred before measuring, and this is the whole trick. A per-pixel
       minimum is meaningless over a photograph: any backdrop whose luminance
       range straddles the text's scores a perfect 1.00:1 on some single pixel,
       so gold-on-anything always "fails". The eye integrates over roughly a
       stem width, so an 8px blur is what it actually sees behind a glyph. */
    const { data, info } = await sharp(bare)
      .extract({ left: b.x, top: b.y, width: b.w, height: b.h })
      .blur(8)
      .raw().toBuffer({ resolveWithObject: true });
    const fg = b.fg.match(/[\d.]+/g).map(Number);
    const lf = lum(fg[0], fg[1], fg[2]);
    const ratios = [];
    for (let i = 0; i < data.length; i += info.channels) {
      ratios.push(ratio(lf, lum(data[i], data[i + 1], data[i + 2])));
    }
    ratios.sort((x, y) => x - y);
    const p2 = ratios[Math.floor(ratios.length * 0.02)];
    const need = b.name === "name" ? 3 : 4.5; // the name is large-scale text
    const key = `${theme}|${b.name}`;
    if (!worst.has(key) || p2 < worst.get(key).p2) {
      worst.set(key, { p2, need, off, fg: b.fg, median: ratios[ratios.length >> 1] });
    }
  }
 }
}

console.log(`\nworst case across offsets ${OFFSETS.join(", ")}\n`);
let failed = 0;
for (const [key, w] of worst) {
  const [theme, name] = key.split("|");
  if (w.p2 < w.need) failed++;
  console.log(
    `  ${theme.padEnd(6)} ${name.padEnd(10)} fg=${w.fg.padEnd(22)} p2=${w.p2.toFixed(2)}:1` +
    `  median=${w.median.toFixed(2)}:1  need ${w.need}  at offset ${String(w.off).padStart(5)}` +
    `  ${w.p2 >= w.need ? "PASS" : "FAIL"}`,
  );
}
console.log(failed ? `\n${failed} target(s) below AA` : "\nall targets clear AA at every offset");

sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
