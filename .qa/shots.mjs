/* Scroll-and-shoot QA capture over CDP (no deps — Node 22+ has global WebSocket).
   Real viewport height keeps 100svh honest and lets ScrollTrigger fire naturally.
   Usage: node .qa/shots.mjs <url> <prefix> [dark|light]   env: W, H, MOBILE=1 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const url = process.argv[2] || "http://127.0.0.1:3100/";
const prefix = process.argv[3] || "shot";
const theme = process.argv[4] || "dark";
const W = Number(process.env.W || 1440);
const H = Number(process.env.H || 900);
const MOBILE = process.env.MOBILE === "1";
const PORT = 9333 + (MOBILE ? 1 : 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  "--autoplay-policy=no-user-gesture-required",
  `--window-size=${W},${H}`,
  `--user-data-dir=${OUT}\\cdp-profile-${PORT}`,
  "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  } catch {}
}
if (!target) { chrome.kill(); throw new Error("chrome did not expose a page target"); }

const sock = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
let seq = 0;
const pending = new Map();
sock.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const cmd = (method, params = {}) =>
  new Promise((res) => { const id = ++seq; pending.set(id, res); sock.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) =>
  (await cmd("Runtime.evaluate", { expression, returnByValue: true })).result?.result?.value;

await cmd("Page.enable");
await cmd("Runtime.enable");
// Headless Chrome reports prefers-reduced-motion: reduce by default, which makes
// every guarded animation early-return. Emulate a normal visitor instead.
await cmd("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
await cmd("Emulation.setDeviceMetricsOverride", {
  width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE,
});
await cmd("Page.navigate", { url });
for (let i = 0; i < 40; i++) {
  if ((await evaluate("document.readyState")) === "complete") break;
  await sleep(300);
}
// Loader intro + first paint of the hero video.
await sleep(4000);

if (theme === "light") {
  await evaluate(`(()=>{try{localStorage.setItem("theme","light")}catch(e){};document.documentElement.setAttribute("data-theme","light")})()`);
  await sleep(600);
}

const height = await evaluate("document.documentElement.scrollHeight");
const step = Math.round(H * 0.86);
const shots = [];
for (let n = 0, y = 0; y < height; n++, y += step) {
  await evaluate(`window.scrollTo({top:${y},behavior:"instant"});document.documentElement.scrollTop=${y};`);
  await sleep(1400); // let ScrollTrigger reveal + lazy images settle
  const at = await evaluate("Math.round(window.scrollY)");
  const png = (await cmd("Page.captureScreenshot", { format: "png" })).result?.data;
  const file = `${prefix}-${String(n).padStart(2, "0")}.png`;
  writeFileSync(`${OUT}\\${file}`, Buffer.from(png, "base64"));
  shots.push({ file, wanted: y, scrollY: at });
}

const stuck = await evaluate(`(()=>{const b=[];document.querySelectorAll(".reveal").forEach((el,i)=>{if(parseFloat(getComputedStyle(el).opacity)<0.9)b.push((el.tagName+"."+String(el.className).slice(0,60)))});return b.slice(0,12)})()`);

console.log(JSON.stringify({ viewport: [W, H], theme, height, shots, stuckReveals: stuck }, null, 1));
sock.close();
chrome.kill();
process.exit(0);
