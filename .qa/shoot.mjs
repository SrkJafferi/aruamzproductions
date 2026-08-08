/* Shoots one named section in both themes at full height, so a restructure can be
   looked at rather than inferred from a build log.
   Usage: node .qa/shoot.mjs <aria-labelledby id> [slug] [url] */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const id = process.argv[2];
const slug = process.argv[3] || id;
const url = process.argv[4] || "http://127.0.0.1:3100/";
if (!id) { console.error("usage: node .qa/shoot.mjs <aria-labelledby id> [slug] [url]"); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9383", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-shoot`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9383/json/list")).json();
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
await cmd("Page.navigate", { url });
for (let i = 0; i < 60; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(4200);

/* Either naming convention. Most sections carry a visible heading and point at
   it with aria-labelledby, but a band whose label has no on-screen counterpart
   (the logo belt) names itself with aria-label instead, and it still has to be
   shootable. */
const SEL = `(document.querySelector('[aria-labelledby="${id}"]')
  || document.querySelector('[aria-label="${id}"]'))`;
if (!(await ev(`!!${SEL}`))) throw new Error(`no section labelled by #${id}`);

for (const theme of ["dark", "light"]) {
  await ev(`document.documentElement.setAttribute("data-theme","${theme}")`);
  const box = await ev(
    `(()=>{const r=${SEL}.getBoundingClientRect();
      return {x:0,y:Math.round(r.top+scrollY),w:Math.round(innerWidth),h:Math.round(r.height)};})()`,
  );
  /* Scrolled into view before the clip is taken, not just clipped from the top of
     the document: everything in this page reveals on scroll, so a section that was
     never reached shoots as a band of empty space. */
  await ev(`scrollTo({top:${box.y - 80},behavior:"instant"})`);
  await sleep(1800);

  const shot = await cmd("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 },
  });
  const file = `${OUT}\\${slug}-${theme}.png`;
  writeFileSync(file, Buffer.from(shot.result.data, "base64"));
  console.log(`  ${theme.padEnd(6)} ${box.w}x${box.h}  ${file}`);
}

sock.close(); chrome.kill(); process.exit(0);
