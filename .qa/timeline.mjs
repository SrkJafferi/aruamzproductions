/* Polls the hero's animated properties every 100ms and prints when each one
   actually moves. Proves the intro plays *after* the curtain lifts rather than
   finishing behind it. Usage: node .qa/timeline.mjs <url> */
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const url = process.argv[2] || "http://127.0.0.1:3100/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9351", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required", "--window-size=1366,651",
  `--user-data-dir=${OUT}\\cdp-tl`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9351/json/list")).json();
    target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  } catch {}
}
const sock = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
let seq = 0; const pending = new Map();
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const cmd = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); sock.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => (await cmd("Runtime.evaluate", { expression, returnByValue: true })).result?.result?.value;

await cmd("Page.enable");
await cmd("Runtime.enable");
// Headless Chrome reports prefers-reduced-motion: reduce by default, which makes
// every guarded animation early-return. Emulate a normal visitor instead.
await cmd("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
await cmd("Page.navigate", { url });

const PROBE = `(()=>{const q=s=>document.querySelector(s);
 const line=q("[data-hero-line]"), rule=q("[data-hero-rule]"), frame=q("section [class*=will-change]");
 const curtain=[...document.querySelectorAll("div")].find(d=>getComputedStyle(d).zIndex==="200");
 const my=el=>{if(!el)return null;const m=new DOMMatrixReadOnly(getComputedStyle(el).transform);return +m.f.toFixed(1)};
 return {ready:document.documentElement.dataset.ready||"-",curtain:!!curtain,
  lineY:my(line),ruleX:rule?+new DOMMatrixReadOnly(getComputedStyle(rule).transform).a.toFixed(3):null,
  frameScale:frame?+new DOMMatrixReadOnly(getComputedStyle(frame).transform).a.toFixed(3):null}})()`;

const t0 = Date.now();
const rows = [];
for (let i = 0; i < 55; i++) {
  const v = await evaluate(PROBE);
  rows.push({ t: Date.now() - t0, ...(v || {}) });
  await sleep(100);
}
sock.close(); chrome.kill();

// Collapse to transitions only, so the log shows change points not 55 lines.
let prev = null;
const key = (r) => `${r.ready}|${r.curtain}|${r.lineY}|${r.ruleX}|${r.frameScale}`;
for (const r of rows) {
  const k = key(r);
  if (k !== prev) {
    console.log(`t=${String(r.t).padStart(4)}ms ready=${r.ready} curtain=${r.curtain ? "UP" : "gone"} lineY=${r.lineY} ruleScaleX=${r.ruleX} frameScale=${r.frameScale}`);
    prev = k;
  }
}
process.exit(0);
