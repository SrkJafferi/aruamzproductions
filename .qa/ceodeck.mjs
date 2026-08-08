/* Proves the CEO backdrop is pinned rather than scrolling: parks the section at
   several offsets and reads the plate's viewport rect against the section's. A
   pinned plate keeps top≈0 while sectionTop marches; a plate that merely looks
   parallaxed would move with it. Usage: node .qa/ceodeck.mjs */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const url = process.argv[2] || "http://127.0.0.1:3100/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9361", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-deck`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9361/json/list")).json();
    target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  } catch {}
}
const sock = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
let seq = 0; const pending = new Map();
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const cmd = (m, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); sock.send(JSON.stringify({ id, method: m, params })); });
const ev = async (expression) => (await cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromiseImmediately: true })).result?.result?.value;

await cmd("Page.enable");
await cmd("Runtime.enable");
// Headless defaults to reduce, which swaps the plate back to absolute.
await cmd("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
await cmd("Page.navigate", { url });
for (let i = 0; i < 60; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(4200);

const SECTION = `document.querySelector('[aria-labelledby="ceo-heading"]')`;
const top = await ev(`${SECTION}.getBoundingClientRect().top + scrollY`);
const height = await ev(`${SECTION}.offsetHeight`);
console.log(`section top=${Math.round(top)} height=${height}`);

const PROBE = `(()=>{const s=${SECTION};const sr=s.getBoundingClientRect();
 const p=s.querySelector(".plate-fixed");const pr=p.getBoundingClientRect();
 const img=p.querySelector("img");
 return {sectionTop:Math.round(sr.top),plateTop:Math.round(pr.top),
  plateH:Math.round(pr.height),plateW:Math.round(pr.width),
  pos:getComputedStyle(p).position,op:getComputedStyle(p).opacity,
  imgW:img?.naturalWidth||0,src:(img?.currentSrc||"").split("/").pop().slice(0,44)}})()`;

const rows = [];
for (const off of [-460, -220, 0, 260, 540, 820]) {
  const y = Math.max(0, Math.round(top + off));
  await ev(`scrollTo({top:${y},behavior:"instant"})`);
  await sleep(650);
  const r = await ev(PROBE);
  rows.push({ off, ...r });
  const shot = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  writeFileSync(`${OUT}\\ceo-${off < 0 ? "n" + -off : "p" + off}.jpg`, Buffer.from(shot.result.data, "base64"));
}

console.log("\n offset  sectionTop  plateTop  plateH  position  opacity");
for (const r of rows) {
  console.log(
    ` ${String(r.off).padStart(6)}  ${String(r.sectionTop).padStart(10)}  ${String(r.plateTop).padStart(8)}` +
    `  ${String(r.plateH).padStart(6)}  ${r.pos.padEnd(8)}  ${r.op}`,
  );
}
const spread = Math.max(...rows.map((r) => Math.abs(r.plateTop)));
console.log(`\nplate drift across ${rows.length} offsets: ${spread}px  → ${spread <= 2 ? "PINNED" : "NOT PINNED"}`);
console.log(`plate clipped to band: ${rows.every((r) => r.plateH <= 900) ? "yes" : "no"}  (viewport 900)`);
console.log(`image: ${rows[0].src} natural=${rows[0].imgW}px`);
sock.close(); chrome.kill(); process.exit(0);
