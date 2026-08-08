/* Proves a `.plate-fixed` backdrop is really pinned to the viewport rather than
   travelling with its section. Parks the page at a spread of offsets and reads
   the plate's viewport-relative top: pinned means that number never moves, no
   matter where the section has got to.
   Usage: node .qa/pin.mjs <aria-labelledby id> */
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const id = process.argv[2];
if (!id) { console.error("usage: node .qa/pin.mjs <aria-labelledby id>"); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9397", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-pin`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9397/json/list")).json();
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
  const q = ++seq; pending.set(q, res); sock.send(JSON.stringify({ id: q, method: m, params }));
});
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
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/" });
for (let i = 0; i < 60; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(4200);

const SECTION = `document.querySelector('[aria-labelledby="${id}"]')`;
if (!(await ev(`!!${SECTION}.querySelector(".plate-fixed")`))) {
  throw new Error(`#${id} has no .plate-fixed child — nothing to prove`);
}
const top = await ev(`${SECTION}.getBoundingClientRect().top + scrollY`);

console.log(`\n  offset   sectionTop   plateTop   drift`);
const tops = [];
for (const off of [-460, -220, 0, 260, 540, 820]) {
  await ev(`scrollTo({top:${Math.round(top + off)},behavior:"instant"})`);
  await sleep(420);
  const r = await ev(
    `(()=>{const s=${SECTION};return {
       sec: Math.round(s.getBoundingClientRect().top),
       plate: Math.round(s.querySelector(".plate-fixed").getBoundingClientRect().top)};})()`,
  );
  tops.push(r.plate);
  console.log(
    `  ${String(off).padStart(6)}   ${String(r.sec).padStart(10)}   ${String(r.plate).padStart(8)}` +
    `   ${String(r.plate - tops[0]).padStart(5)}`,
  );
}
const drift = Math.max(...tops) - Math.min(...tops);
/* A pinned plate reads the same viewport top at every scroll position. Any drift
   at all means an ancestor became a containing block for fixed boxes — usually
   `contain: paint`, a `transform`, or a `filter` added upstream. */
console.log(drift === 0 ? `\n  drift ${drift}px — PINNED` : `\n  drift ${drift}px — NOT PINNED`);
sock.close(); chrome.kill(); process.exit(drift === 0 ? 0 : 1);
