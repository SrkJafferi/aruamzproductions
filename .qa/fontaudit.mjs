/* Reads the *computed* font family off every heading, body copy and label on
   the page, so a font swap can be proved rather than eyeballed. Flags any
   element that fell back to a system stack. Usage: node .qa/fontaudit.mjs <url> */
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const url = process.argv[2] || "http://127.0.0.1:3100/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9353", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-font`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9353/json/list")).json();
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
await cmd("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
await cmd("Page.navigate", { url });
for (let i = 0; i < 40; i++) {
  if ((await evaluate("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(3500);
await evaluate("document.fonts.ready");

// Forbidden by the brand spec; a match here means a token failed to resolve.
const PROBE = `(()=>{const BAD=/roboto|arial|inter|space grotesk|helvetica|times|impact|ui-sans/i;
 const fam=el=>getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g,"").trim();
 const rows=[],seen=new Map();
 document.querySelectorAll("h1,h2,h3,h4,p,li,a,button,span,label,input").forEach(el=>{
  if(!el.textContent||!el.textContent.trim())return;
  const r=el.getBoundingClientRect(); if(!r.width&&!r.height)return;
  const f=fam(el),k=el.tagName+"|"+f;
  if(!seen.has(k))seen.set(k,{tag:el.tagName,font:f,n:0,sample:el.textContent.trim().slice(0,34)});
  seen.get(k).n++;});
 for(const v of seen.values())rows.push(v);
 const bad=rows.filter(r=>BAD.test(r.font));
 return {rows:rows.sort((a,b)=>b.n-a.n),bad,
  families:[...new Set(rows.map(r=>r.font))].sort(),
  loaded:[...document.fonts].filter(f=>f.status==="loaded").map(f=>f.family+" "+f.weight)}})()`;

const v = await evaluate(PROBE);
console.log("families in use:", v.families.join(" | "));
console.log("font faces loaded:", [...new Set(v.loaded)].join(" | "));
console.log("\n tag      font                 count  sample");
for (const r of v.rows) {
  console.log(` ${r.tag.padEnd(8)} ${r.font.padEnd(20)} ${String(r.n).padStart(5)}  ${r.sample}`);
}
console.log(v.bad.length ? `\nFORBIDDEN FALLBACKS: ${JSON.stringify(v.bad)}` : "\nno forbidden fallbacks");
sock.close(); chrome.kill(); process.exit(0);
