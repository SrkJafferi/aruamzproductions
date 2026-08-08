/* Grades the Company Facts band now that a photograph sits behind it and the
   cards are translucent. The old flat token comparison is no longer valid: what
   is painted under a number is the plate, the scrim, the accent pool, the grain
   AND the card's 62% fill composited together, which no computed style reports.

   Usage: node .qa/factstheme.mjs */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const url = process.argv[2] || "http://127.0.0.1:3100/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9377", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,1000", `--user-data-dir=${OUT}\\cdp-facts2`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9377/json/list")).json();
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
/* Throws on a page-side exception instead of returning undefined. A silent
   failure reads as "the backdrop is too bright" rather than "the probe never
   ran", which is a far more expensive mistake to chase. */
const ev = async (expression) => {
  const { result } = await cmd("Runtime.evaluate", { expression, returnByValue: true });
  if (result?.exceptionDetails) {
    throw new Error(`page-side: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
  }
  return result?.result?.value;
};

await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await cmd("Page.navigate", { url });
for (let i = 0; i < 60; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(4200);

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

const SECTION = `document.querySelector('[aria-labelledby="facts-heading"]')`;
/* The heading and the number are display-scale, so 3:1 is their floor; the sub
   and the 11px mono label get the full 4.5.
   Each element is hidden individually rather than by hiding the whole
   .container-page: the cards ARE in that container, and blanking them would
   measure the numbers against the bare plate instead of against the 62% fill
   they actually sit on — pessimistic to the point of being a different test. */
const TARGETS = [
  { name: "heading", sel: "#facts-heading", need: 3 },
  { name: "sub", sel: "header p", need: 4.5 },
  { name: "number", sel: "[data-fact] dd", need: 3 },
  { name: "label", sel: "[data-fact] dt", need: 4.5 },
];
const HIDE_SEL = TARGETS.map((t) => t.sel).join(", ");

/* The plate is position:fixed, so the crop behind any given glyph is a function
   of scroll — one parked offset grades one crop and says nothing about the rest
   of the pass. Sweep and report the worst case. */
const OFFSETS = [-300, -200, -110, -40, 20];
const worst = new Map();

const top = await ev(`${SECTION}.getBoundingClientRect().top + scrollY`);

for (const theme of ["dark", "light"]) {
  for (const off of OFFSETS) {
    await ev(`document.documentElement.setAttribute("data-theme","${theme}")`);
    await ev(`scrollTo({top:${Math.round(top + off)},behavior:"instant"})`);
    // Long enough on the first park for the counters to settle, so the digits
    // being measured are the final ones and their boxes are their final width.
    await sleep(off === OFFSETS[0] ? 3000 : 500);

    const boxes = await ev(
      `(()=>{const s=${SECTION};const out=[];
        for (const t of ${JSON.stringify(TARGETS)}) {
          for (const el of s.querySelectorAll(t.sel)) {
            const r = el.getBoundingClientRect();
            if (r.width < 4 || r.height < 4) continue;
            out.push({name:t.name, need:t.need, fg:getComputedStyle(el).color,
              x:Math.round(r.left), y:Math.round(r.top),
              w:Math.round(r.width), h:Math.round(r.height)});
          }
        }
        return out;})()`,
    );

    const dressed = await cmd("Page.captureScreenshot", { format: "png" });
    if (off === -110) writeFileSync(`${OUT}\\facts-${theme}.png`, png(dressed.result.data));

    // visibility, not display: the layout must not shift, or the boxes measured
    // above stop describing the frame being sampled.
    const HIDE = `${SECTION}.querySelectorAll(${JSON.stringify(HIDE_SEL)}).forEach(e=>e.style.visibility=`;
    await ev(`${HIDE}"hidden")`);
    await sleep(320);
    const bare = png((await cmd("Page.captureScreenshot", { format: "png" })).result.data);
    await ev(`${HIDE}"")`);

    if (Buffer.compare(bare, png(dressed.result.data)) === 0) {
      throw new Error(`[${theme} @${off}] bare frame identical to dressed — the hide did not land`);
    }

    /* Anything a fixed overlay covers is not this section's backdrop. Asserted
       rather than inferred from the scroll position, so the probe can never
       silently grade the navbar. */
    const navBottom = await ev(`(document.querySelector("header[class*='fixed'], body > header")?.getBoundingClientRect().bottom)||0`);
    const vh = await ev("innerHeight");

    for (const b of boxes) {
      if (b.y < navBottom || b.y + b.h > vh || b.y < 0) continue;
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
      const key = `${theme}|${b.name}`;
      if (!worst.has(key) || p2 < worst.get(key).p2) {
        worst.set(key, { p2, need: b.need, off, fg: b.fg, median: ratios[ratios.length >> 1] });
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
    `  ${theme.padEnd(6)} ${name.padEnd(8)} fg=${w.fg.padEnd(22)} p2=${w.p2.toFixed(2)}:1` +
    `  median=${w.median.toFixed(2)}:1  need ${String(w.need).padEnd(4)} at offset ${String(w.off).padStart(5)}` +
    `  ${w.p2 >= w.need ? "PASS" : "FAIL"}`,
  );
}
console.log(failed ? `\n${failed} target(s) below AA` : "\nall targets clear AA at every offset");
sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
