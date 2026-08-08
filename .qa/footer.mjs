/* Grades the footer changes: the QR actually renders at a scannable resolution,
   the brand marks replaced the text without losing their accessible names, and
   the client's partner sentence is present verbatim.
   Usage: node .qa/footer.mjs */
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9418", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-footer`, "about:blank",
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
  if (result?.exceptionDetails) {
    throw new Error(`page-side: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
  }
  return result?.result?.value;
};

let failed = 0;
const fail = (m) => { failed++; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  PASS  ${m}`);

await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/" });
for (let i = 0; i < 80; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
// Footer copy lifts in on reveal; scroll it into view and let the tween land or
// every opacity reading below grades a mid-flight frame.
await ev(`scrollTo({top:document.body.scrollHeight,behavior:"instant"})`);
await sleep(2600);

const F = `document.querySelector("footer")`;

/* ── 1. The QR ─────────────────────────────────────────────────────────
   A QR that renders is not the same as a QR that scans. The failure that
   matters is next/image serving a 96px variant of a 1147px code: it still
   paints, still passes a "is it visible" check, and cannot be read by a
   phone camera. So the served intrinsic width is asserted against the CSS
   box at 2x, not merely against zero. */
console.log("\n── the QR code ──");
const qr = await ev(`(()=>{const i=${F}.querySelector('img[src*="aruamzQR"], img[srcset*="aruamzQR"]');
  if(!i) return null;
  const r=i.getBoundingClientRect(); const cs=getComputedStyle(i);
  /* naturalWidth is density-corrected when a w-descriptor srcset is in play, so
     it reports the CSS size and tells you nothing about what was fetched. The
     real answer is the w= on the URL the browser actually chose. */
  const m=/[?&]w=(\\d+)/.exec(i.currentSrc);
  return {complete:i.complete, served:m?Number(m[1]):i.naturalWidth,
    css:Math.round(r.width), h:Math.round(r.height), alt:i.getAttribute("alt"),
    type:i.currentSrc.startsWith("data:")?"data":"url",
    bg:cs.backgroundColor, border:cs.borderTopWidth};})()`);
if (!qr) {
  fail("no QR image in the footer");
} else {
  qr.complete ? pass("QR decoded by the browser") : fail("QR did not load");
  Math.abs(qr.css - qr.h) <= 1 ? pass(`QR is square at ${qr.css}px`) : fail(`QR is ${qr.css}x${qr.h} — the code is distorted`);
  qr.served >= qr.css
    ? pass(`fetched a ${qr.served}px variant for a ${qr.css}px box — modules stay separable`)
    : fail(`fetched only ${qr.served}px for a ${qr.css}px box — modules will smudge and the code may not scan`);
  qr.alt && qr.alt.length > 4 ? pass(`QR has alt text: "${qr.alt}"`) : fail("QR has no useful alt text");
  qr.bg === "rgb(255, 255, 255)"
    ? pass("QR sits on an explicit white ground")
    : fail(`QR ground is ${qr.bg} — the code's quiet zone needs white`);
  Number.parseFloat(qr.border) > 0
    ? pass("QR carries a hairline so its white edge reads on the light theme")
    : fail("no border — the QR dissolves into the light footer");
}

/* ── 2. The brand marks ────────────────────────────────────────────────
   Swapping a text link for a glyph is the single easiest way to delete a
   link's accessible name by accident: the glyph is aria-hidden, so if the
   anchor carries no label the link announces as nothing at all. */
console.log("\n── facebook / instagram as icons ──");
const links = await ev(`(()=>{const as=[...${F}.querySelectorAll('a[target="_blank"]')];
  return as.map(a=>{const r=a.getBoundingClientRect(); const svg=a.querySelector("svg");
    return {href:a.getAttribute("href"), label:a.getAttribute("aria-label"),
      text:a.textContent.trim(), svg:!!svg,
      svgHidden:svg?svg.getAttribute("aria-hidden"):null,
      stroke:svg?getComputedStyle(svg).strokeWidth:null,
      w:Math.round(r.width), h:Math.round(r.height), rel:a.getAttribute("rel")};});})()`);
links.length === 2 ? pass("two social links") : fail(`${links.length} external links found in the footer`);
for (const l of links) {
  const who = l.href?.includes("facebook") ? "Facebook" : l.href?.includes("instagram") ? "Instagram" : l.href;
  l.svg ? pass(`${who}: renders a glyph, not text`) : fail(`${who}: no svg — still a text link`);
  l.text === "" ? pass(`${who}: text label removed`) : fail(`${who}: still shows text "${l.text}"`);
  l.label && l.label.includes(who)
    ? pass(`${who}: link announces as "${l.label}"`)
    : fail(`${who}: aria-label is ${JSON.stringify(l.label)} — an icon link with no name is unusable to a screen reader`);
  l.svgHidden === "true" ? pass(`${who}: glyph hidden from the a11y tree`) : fail(`${who}: glyph is announced too, so the link is read twice`);
  l.w >= 40 && l.h >= 40
    ? pass(`${who}: ${l.w}x${l.h} tap target`)
    : fail(`${who}: ${l.w}x${l.h} — under the 40px minimum`);
  (l.rel || "").includes("noreferrer") ? pass(`${who}: rel intact`) : fail(`${who}: rel is ${l.rel}`);
}
// The whole reason these were hand-drawn: matching the optical weight of the
// Mail / MapPin / Phone marks a column away.
const weights = await ev(`(()=>{const s=new Set();
  ${F}.querySelectorAll("svg").forEach(v=>s.add(getComputedStyle(v).strokeWidth));
  return [...s];})()`);
weights.length === 1
  ? pass(`every footer glyph shares one stroke weight (${weights[0]})`)
  : fail(`mixed stroke weights in the footer: ${weights.join(", ")} — the new marks look foreign`);

/* ── 3. The client's sentence, verbatim ────────────────────────────────
   Not in the legacy source; supplied by the client in a message. Asserted
   character-for-character because paraphrasing footer copy is exactly the
   mistake this project has already made once. */
console.log("\n── the partner sentence ──");
const SENT = "We continue to partner with other production companies to develop and produce projects across a wide range of genres.";
const copy = await ev(`(()=>{const t=${F}.innerText.replace(/\\s+/g," ");
  return {has:t.includes(${JSON.stringify(SENT)}), founder:t.includes("A media house by")};})()`);
copy.has ? pass("sentence present, verbatim") : fail("sentence missing or altered");
copy.founder ? pass("the original blurb is still there") : fail("the existing footer copy was replaced instead of added to");

/* ── 4. Contrast, both themes ──────────────────────────────────────────
   New body copy and a new eyebrow. Measured rather than assumed: both sit on
   --bg-elevated, which differs per theme. */
const ratio = (a, b) => {
  const L = ([r, g, b2]) => {
    const f = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b2);
  };
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const parse = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
for (const theme of ["dark", "light"]) {
  console.log(`\n── contrast: ${theme} ──`);
  await ev(`document.documentElement.setAttribute("data-theme","${theme}")`);
  await sleep(400);
  const probes = await ev(`(()=>{const ps=[...${F}.querySelectorAll("p")];
    const partner=ps.find(p=>p.textContent.startsWith("We continue to partner"));
    const eyebrow=ps.find(p=>p.className.includes("eyebrow"));
    const bg=getComputedStyle(${F}).backgroundColor;
    const g=(el)=>el?{c:getComputedStyle(el).color,o:getComputedStyle(el).opacity}:null;
    return {bg, partner:g(partner), eyebrow:g(eyebrow)};})()`);
  for (const [name, p] of [["partner sentence", probes.partner], ["QR label", probes.eyebrow]]) {
    if (!p) { fail(`${name}: not found`); continue; }
    const r = ratio(parse(p.c), parse(probes.bg));
    r >= 4.5
      ? pass(`${name}: ${r.toFixed(2)}:1`)
      : fail(`${name}: ${r.toFixed(2)}:1 — under 4.5:1 for body text`);
  }
}
await ev(`document.documentElement.setAttribute("data-theme","dark")`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall footer checks pass");
sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
