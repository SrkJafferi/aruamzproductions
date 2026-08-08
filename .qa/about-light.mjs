/* The About page in the light palette, plus a shot of the who-we-are frame in
   full so the corner bracket can be seen whole. Usage: node .qa/about-light.mjs */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9439", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-about-light`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9439/json/list")).json();
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
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/about-us" });
await sleep(8000);

const scrollTo = async (y) => {
  await ev(`(()=>{const l=window.__lenis;
    if(l&&l.scrollTo) l.scrollTo(${y},{immediate:true}); else window.scrollTo(0,${y});})()`);
  await sleep(900);
};

/* The whole who-we-are frame, so the offset corner bracket is in view. */
const whoTop = await ev(`Math.round(document.querySelectorAll("main > section")[1].offsetTop)`);
await scrollTo(whoTop + 240);
await writeFile(`${OUT}\\about-who-frame.png`, await shot());
console.log(`  shot  .qa\\about-who-frame.png`);

/* Flip to light. The theme lives on data-theme, not on the media query, so it
   has to be set the way the toggle sets it. */
await ev(`(()=>{document.documentElement.setAttribute("data-theme","light");
  try{localStorage.setItem("aruamz-theme","light")}catch{}})()`);
await sleep(900);

const bands = [["about-light-01-hero", 0], ["about-light-02-who", whoTop]];
const rest = await ev(`(()=>{const s=[...document.querySelectorAll("main > section")];
  return [Math.round(s[2].offsetTop), Math.round(s[3].offsetTop), Math.round(s[4].offsetTop),
          Math.round(s[5].offsetTop)];})()`);
bands.push(["about-light-03-principles", rest[0]], ["about-light-04-craft", rest[1]],
  ["about-light-05-featured", rest[2]], ["about-light-06-results", rest[3]]);

for (const [name, y] of bands) {
  await scrollTo(Math.max(0, y - 40));
  await sleep(600);
  await writeFile(`${OUT}\\${name}.png`, await shot());
  console.log(`  shot  .qa\\${name}.png`);
}

/* Contrast of the copy that is NOT on footage — those bands swap with the
   theme, so they are the ones the light palette can break. */
const readable = await ev(`(()=>{
  const lin=c=>{const s=c/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4);};
  const L=(r,g,b)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
  const resolve=(colour,over)=>{
    const read=(bg)=>{const cv=document.createElement("canvas");cv.width=cv.height=1;
      const x=cv.getContext("2d");x.fillStyle=bg;x.fillRect(0,0,1,1);
      x.fillStyle=colour;x.fillRect(0,0,1,1);return x.getImageData(0,0,1,1).data;};
    const b=read("#000"), w=read("#fff");
    const a=1-(w[0]-b[0])/255;
    const fg=a<=0.001?{r:0,g:0,b:0}:{r:b[0]/a,g:b[1]/a,b:b[2]/a};
    return {r:fg.r*a+over.r*(1-a),g:fg.g*a+over.g*(1-a),b:fg.b*a+over.b*(1-a)};
  };
  const bgOf=(el)=>{let n=el;while(n&&n!==document.documentElement){
    const c=getComputedStyle(n).backgroundColor;
    if(c&&c!=="rgba(0, 0, 0, 0)"&&!/,\\s*0\\)$/.test(c)){
      const m=c.match(/[\\d.]+/g);return {r:+m[0],g:+m[1],b:+m[2]};}
    n=n.parentElement;} return {r:255,g:255,b:255};};
  const out=[];
  for(const [name,sel] of [
    ["who body","#about-who-heading ~ p"],
    ["overview body","#about-principles-heading ~ * article:nth-of-type(1) p"],
    ["chip label","#about-featured ul li"],
  ]){
    const el=document.querySelector(sel);
    if(!el){out.push({name,missing:true});continue;}
    const cs=getComputedStyle(el);
    const bg=bgOf(el);
    const px=resolve(cs.color,bg);
    const ratio=(Math.max(L(px.r,px.g,px.b),L(bg.r,bg.g,bg.b))+0.05)
      /(Math.min(L(px.r,px.g,px.b),L(bg.r,bg.g,bg.b))+0.05);
    const size=parseFloat(cs.fontSize), weight=parseInt(cs.fontWeight,10)||400;
    const large=size>=24||(size>=18.66&&weight>=700);
    out.push({name,size,weight,ratio:+ratio.toFixed(2),floor:large?3:4.5});
  }
  return out;})()`);

console.log("\nlight palette, copy on its own surface:");
let ok = true;
for (const c of readable) {
  if (c.missing) { console.log(`  ?     ${c.name} — selector not found`); continue; }
  const pass = c.ratio >= c.floor;
  if (!pass) ok = false;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${c.name.padEnd(14)} ${c.size}px/${c.weight}  ${c.ratio}:1  (floor ${c.floor})`);
}
console.log(`\n${ok ? "PASS" : "FAIL"}  light palette`);

sock.close(); chrome.kill(); process.exit(0);
