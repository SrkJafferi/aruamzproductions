/* Times the hero intro: shoots the same viewport at fixed offsets from first
   paint so a still can prove the animation actually plays for a real visitor.
   Usage: node .qa/intro.mjs <url> [W H] */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const url = process.argv[2] || "http://127.0.0.1:3100/";
const W = Number(process.argv[3] || 1366);
const H = Number(process.argv[4] || 651);
const AT_MS = [900, 2400, 3000, 3700, 4600, 7000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9350", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required",
  `--window-size=${W},${H}`, `--user-data-dir=${OUT}\\cdp-intro`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9350/json/list")).json();
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
await cmd("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cmd("Page.navigate", { url });

const t0 = Date.now();
const frames = [];
for (const at of AT_MS) {
  const wait = at - (Date.now() - t0);
  if (wait > 0) await sleep(wait);
  const png = (await cmd("Page.captureScreenshot", { format: "png" })).result?.data;
  const file = `intro-${String(at).padStart(4, "0")}.png`;
  writeFileSync(`${OUT}\\${file}`, Buffer.from(png, "base64"));
  frames.push(file);
}

const state = await evaluate(`(()=>{const v=document.querySelector("section video");const h=document.querySelector("h1");const n=document.querySelector("header,nav");
 return {videoSrc:v&&v.currentSrc,videoTime:v&&+v.currentTime.toFixed(2),videoPaused:v&&v.paused,videoW:v&&v.videoWidth,
 h1Font:h&&getComputedStyle(h).fontFamily,h1Size:h&&getComputedStyle(h).fontSize,
 h1Top:h&&Math.round(h.getBoundingClientRect().top),navBottom:n&&Math.round(n.getBoundingClientRect().bottom),
 heroH:Math.round(document.querySelector("section").getBoundingClientRect().height)}})()`);

console.log(JSON.stringify({ viewport: [W, H], frames, state }, null, 1));
sock.close(); chrome.kill(); process.exit(0);
