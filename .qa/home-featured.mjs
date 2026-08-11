/* Homepage Featured Projects QA: does expanding the grid leave every still on
   screen, and does each masonry column carry tiles?

   Written for a reported defect: clicking "Show 38 more" blanked the whole first
   column. `.reveal-done` could not out-specify `.js .reveal`, so a settled tile
   was visible only through the inline opacity GSAP left behind — and the effect's
   own ctx.revert() stripped exactly that on re-render, while the done marker made
   every later pass skip the tile. Nothing reported an error; the images were
   simply at opacity 0.

   Usage: node .qa/home-featured.mjs */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9445", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-home`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9445/json/list")).json();
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
/* The animated path is the one under test: the reduced-motion branch marks every
   tile done up front and never builds the tweens whose teardown caused this. */
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/" });
await sleep(9000);

const scrollTo = async (y) => {
  await ev(`(()=>{const l=window.__lenis;
    if(l&&l.scrollTo) l.scrollTo(${y},{immediate:true}); else window.scrollTo(0,${y});})()`);
  await sleep(900);
};

let ok = true;
const fail = (m) => { ok = false; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  PASS  ${m}`);

/* Walks the whole section so every tile's ScrollTrigger has fired, then reports
   opacity and column for each. A tile is keyed by its position in DOM order. */
const readTiles = async () => {
  const top = await ev(`Math.round(document.querySelector("#projects").offsetTop)`);
  const bottom = await ev(`(()=>{const s=document.querySelector("#projects");
    return Math.round(s.offsetTop+s.offsetHeight);})()`);
  for (let y = top - 200; y < bottom + 400; y += 600) await scrollTo(Math.max(0, y));
  await sleep(1500);
  return ev(`(()=>{const t=[...document.querySelectorAll("[data-tile]")];
    return t.map((el,i)=>({i:i+1, op:+parseFloat(getComputedStyle(el).opacity).toFixed(3),
      left:Math.round(el.getBoundingClientRect().left),
      done:el.classList.contains("reveal-done"),
      w:Math.round(el.getBoundingClientRect().width)}));})()`);
};

const report = (tiles, label, expected) => {
  if (tiles.length !== expected) fail(`${label}: ${tiles.length} tiles rendered, expected ${expected}`);
  else pass(`${label}: ${expected} tiles rendered`);

  const dark = tiles.filter((t) => t.op < 0.99);
  if (dark.length) {
    fail(`${label}: ${dark.length} tiles are at opacity < 1 — ` +
      `positions ${dark.slice(0, 12).map((t) => `${t.i}(${t.op})`).join(", ")}` +
      `${dark.length > 12 ? ", …" : ""}`);
  } else pass(`${label}: every tile is fully opaque`);

  /* The reported symptom, stated as the thing it actually was: one whole column
     of the masonry carrying nothing a visitor can see. */
  const cols = [...new Set(tiles.map((t) => t.left))].sort((a, b) => a - b);
  const lit = cols.map((c) => tiles.filter((t) => t.left === c && t.op >= 0.99).length);
  const empty = cols.filter((c, n) => lit[n] === 0);
  if (empty.length) fail(`${label}: column at x=${empty.join(", ")} has no visible tile (per-column visible: ${lit.join("/")})`);
  else pass(`${label}: all ${cols.length} columns populated, ${lit.join("/")} visible per column`);
  return cols;
};

/* ── 1. the CSS rule itself, independent of any effect ───────────────────── */
/* The defect was one of specificity, so it is worth asserting directly rather
   than only through the interaction that exposed it: strip the inline styles a
   settled tile is carrying and it must stay visible on class alone. Before the
   fix `.js .reveal` (two classes) beat `.reveal-done` (one) and this read 0. */
console.log("\nsettled tiles hold up without inline styles:");
await scrollTo(await ev(`Math.round(document.querySelector("#projects").offsetTop)`));
await sleep(1800);
const naked = await ev(`(()=>{const el=document.querySelector("[data-tile].reveal-done");
  if(!el) return null;
  const keep=el.getAttribute("style")||"";
  el.removeAttribute("style");
  const op=+parseFloat(getComputedStyle(el).opacity).toFixed(3);
  const tf=getComputedStyle(el).transform;
  el.setAttribute("style",keep);
  return {op,tf};})()`);
if (!naked) fail(`no settled tile to test — nothing reached .reveal-done`);
else if (naked.op < 0.99) {
  fail(`a settled tile falls to opacity ${naked.op} with its inline styles removed — ` +
    `.reveal-done is losing to .js .reveal`);
} else if (naked.tf !== "none" && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(naked.tf)) {
  fail(`a settled tile keeps transform ${naked.tf} on class alone`);
} else pass(`class alone holds a settled tile at opacity 1, transform none`);

/* ── 2. the collapsed grid ───────────────────────────────────────────────── */
console.log("\ncollapsed:");
const before = await readTiles();
report(before, "collapsed", 12);

/* ── 3. expand, which is where it broke ──────────────────────────────────── */
console.log("\nexpanding:");
const btn = await ev(`(()=>{const b=[...document.querySelectorAll("#projects button")]
    .find(x=>/show \\d+ more/i.test(x.textContent||""));
  if(!b) return null; b.scrollIntoView({block:"center"});
  const r=b.getBoundingClientRect();
  return {label:b.textContent.trim(), x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};})()`);
if (!btn) { fail(`no "Show N more" button in #projects`); }
else {
  pass(`button reads "${btn.label}"`);
  for (const type of ["mousePressed", "mouseReleased"]) {
    await cmd("Input.dispatchMouseEvent", { type, x: btn.x, y: btn.y, button: "left", clickCount: 1 });
  }
  await sleep(2000);

  const total = 12 + Number(btn.label.match(/\d+/)[0]);
  const after = await readTiles();
  const cols = report(after, "expanded", total);

  /* The first twelve are the ones React keeps across the re-render, so they are
     the ones a reverted context could strip. Called out separately because they
     are also the ones that reflow into column one, which is what was seen. */
  const kept = after.slice(0, 12).filter((t) => t.op < 0.99);
  if (kept.length) fail(`the ${kept.length} pre-existing tiles went dark on expand — positions ${kept.map((t) => t.i).join(", ")}`);
  else pass(`the 12 pre-existing tiles survived the re-render`);

  const firstCol = after.filter((t) => t.left === cols[0]);
  if (!firstCol.length) fail(`no tile landed in the first column`);
  else if (firstCol.every((t) => t.op < 0.99)) fail(`the first column is entirely invisible`);
  else pass(`first column holds ${firstCol.length} tiles, ${firstCol.filter((t) => t.op >= 0.99).length} visible`);

  if (btn.label && (await ev(`!![...document.querySelectorAll("#projects button")]
      .find(x=>/show \\d+ more/i.test(x.textContent||""))`))) {
    fail(`the "Show more" button is still present after expanding`);
  } else pass(`the button retires once the grid is open`);

  await scrollTo(await ev(`Math.round(document.querySelector("#projects").offsetTop)`));
  await writeFile(`${OUT}\\home-featured-expanded.png`, await shot());
  console.log(`  shot  .qa\\home-featured-expanded.png`);
}

/* ── 4. and at 390px, where the masonry is a single column ───────────────── */
console.log("\nmobile:");
await cmd("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
});
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/" });
await sleep(9000);
const mBtn = await ev(`(()=>{const b=[...document.querySelectorAll("#projects button")]
    .find(x=>/show \\d+ more/i.test(x.textContent||""));
  if(!b) return null; b.scrollIntoView({block:"center"});
  const r=b.getBoundingClientRect();
  return {n:Number(b.textContent.match(/\\d+/)[0]), x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};})()`);
if (!mBtn) fail(`no "Show N more" button at 390px`);
else {
  for (const type of ["mousePressed", "mouseReleased"]) {
    await cmd("Input.dispatchMouseEvent", { type, x: mBtn.x, y: mBtn.y, button: "left", clickCount: 1 });
  }
  await sleep(2000);
  report(await readTiles(), "expanded @390", 12 + mBtn.n);
}

const over = await ev(`document.documentElement.scrollWidth - window.innerWidth`);
if (over > 1) fail(`horizontal overflow at 390px: ${over}px`);
else pass(`no horizontal overflow at 390px`);

console.log(`\n${ok ? "PASS" : "FAIL"}  homepage Featured Projects`);
sock.close(); chrome.kill(); process.exit(ok ? 0 : 1);
