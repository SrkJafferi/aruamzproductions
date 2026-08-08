/* Asks GSAP directly what it is animating, instead of inferring from computed
   styles. Reports tween count, the line element's inline transform, and whether
   the ready handshake fired. Usage: node .qa/gsapdiag.mjs <url> */
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const url = process.argv[2] || "http://127.0.0.1:3100/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9352", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required", "--window-size=1366,651",
  `--user-data-dir=${OUT}\\cdp-diag`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9352/json/list")).json();
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

// Trap the ready event and the presence of gsap before the app boots.
await cmd("Page.addScriptToEvaluateOnNewDocument", {
  source: `window.__log=[];window.addEventListener("aruamz:ready",()=>window.__log.push(["ready",Math.round(performance.now())]));`,
});
await cmd("Page.navigate", { url });

const PROBE = `(()=>{const line=document.querySelector("[data-hero-line]");
 const g=window.gsap;
 let tweens=null,names=null;
 if(g){const kids=g.globalTimeline.getChildren(true,true,true);tweens=kids.length;
  names=kids.slice(0,6).map(t=>{const tg=t.targets&&t.targets()[0];return (tg&&tg.dataset&&Object.keys(tg.dataset).join(".")||tg&&tg.tagName||"?")+":"+(t.progress&&t.progress().toFixed(2))});}
 return {t:Math.round(performance.now()),hasGsap:!!g,ready:document.documentElement.dataset.ready||"-",
  inline:line?line.style.transform||"(none)":"(no el)",tweens,names,log:JSON.stringify(window.__log||[])}})()`;

for (let i = 0; i < 40; i++) {
  const v = await evaluate(PROBE);
  if (v) console.log(`t=${String(v.t).padStart(4)} gsap=${v.hasGsap} ready=${v.ready} tweens=${v.tweens} inline="${v.inline}" ${v.names ? v.names.join(" ") : ""} ${i === 39 ? "log=" + v.log : ""}`);
  await sleep(150);
}
sock.close(); chrome.kill(); process.exit(0);
