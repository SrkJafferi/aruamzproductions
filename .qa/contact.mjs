/* Contact Us page QA: the legacy page's copy, the form's two send channels, the
   map, and whether gold type clears AA over a lit night-city plate.

   Contrast is measured off rendered pixels rather than computed from a token —
   the hero is a photograph, so the backdrop behind a line of type is whatever
   the frame happens to put there. Usage: node .qa/contact.mjs */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9443", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-contact`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9443/json/list")).json();
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
/* Headless defaults to `prefers-reduced-motion: reduce`, which short-circuits
   every reveal on the page — without this the whole run measures a static
   fallback and reports nothing useful about the animations. */
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/contact-us" });
await sleep(9000);

const scrollTo = async (y) => {
  await ev(`(()=>{const l=window.__lenis;
    if(l&&l.scrollTo) l.scrollTo(${y},{immediate:true}); else window.scrollTo(0,${y});})()`);
  await sleep(900);
};

let ok = true;
const fail = (m) => { ok = false; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  PASS  ${m}`);

/* ── 1. the page carries the legacy page's copy, and only that ───────────── */
console.log("\ncontent flow:");
const flow = await ev(`[...document.querySelectorAll("main h1,main h2")]
  .map(h=>h.tagName+" "+h.textContent.trim())`);
const want = ["H1 Contact Us", "H2 Tell us about your project", "H2 Our Office"];
if ((flow || []).join("|") !== want.join("|"))
  fail(`heading flow is ${JSON.stringify(flow)}, expected ${JSON.stringify(want)}`);
else pass(`H1 "Contact Us" → H2 form → H2 "Our Office", and nothing else`);

/* The client asked for neither on this page, and the legacy page has neither. */
const body = await ev(`document.querySelector("main").innerText`);
for (const banned of ["Company Facts", "Subscribe for our newsletter", "WHAT THEY SAY"]) {
  if ((body || "").toLowerCase().includes(banned.toLowerCase()))
    fail(`"${banned}" is on the page — the client asked for it to be left off`);
  else pass(`no "${banned}" section`);
}

/* ── 2. Our Office, verbatim and reachable ───────────────────────────────── */
console.log("\nour office:");
const officeTop = await ev(`Math.round(document.querySelector("#contact-form").offsetTop)`);
await scrollTo(officeTop + 200);
for (const needle of [
  "410 Burhani Chamber Saddar Abdullah Haroon Road",
  "Karachi, Pakistan",
  "aruamzproductions@gmail.com",
  "(021) 32751847",
  "+92 331 2220136",
]) {
  if ((body || "").includes(needle)) pass(`"${needle}"`);
  else fail(`"${needle}" is not printed on the page`);
}

const links = await ev(`(()=>{const a=document.querySelector("#contact-form aside");
  return [...a.querySelectorAll("a[href]")].map(x=>({href:x.getAttribute("href"),
    h:Math.round(x.getBoundingClientRect().height),
    label:x.getAttribute("aria-label")||x.textContent.trim().replace(/\\s+/g," ")}));})()`);
for (const [what, needle] of [
  ["mailto", "mailto:aruamzproductions@gmail.com"],
  ["tel", "tel:+922132751847"],
  ["WhatsApp", "https://wa.me/923312220136"],
  ["map search", "google.com/maps/search"],
]) {
  const hit = (links || []).find((l) => l.href.includes(needle));
  if (!hit) fail(`no ${what} link in the Our Office panel`);
  else if (hit.h < 44) fail(`${what} link is ${hit.h}px tall — under the 44px touch target`);
  else pass(`${what.padEnd(10)} ${hit.href.slice(0, 52)}  ${hit.h}px`);
}
const socialCount = (links || []).filter((l) => /facebook|instagram/i.test(l.href)).length;
if (socialCount !== 2) fail(`expected 2 social links in the panel, found ${socialCount}`);
else pass(`Facebook and Instagram both linked, as icons`);

/* ── 3. the form validates before it sends ───────────────────────────────── */
console.log("\nform:");
const fields = await ev(`(()=>{const ids=["contact-name","contact-email","contact-phone",
  "contact-subject","contact-message"];
  return ids.map(id=>{const el=document.getElementById(id);
    return {id, there:!!el, labelled:!!document.querySelector('label[for="'+id+'"]'),
            h:el?Math.round(el.getBoundingClientRect().height):0};});})()`);
for (const f of fields || []) {
  if (!f.there) fail(`#${f.id} is missing`);
  else if (!f.labelled) fail(`#${f.id} has no <label for>`);
  else if (f.h < 44) fail(`#${f.id} is ${f.h}px tall — under the 44px touch target`);
  else pass(`#${f.id.padEnd(16)} labelled, ${f.h}px`);
}
const subjects = await ev(`[...document.querySelectorAll("#contact-subject option")].map(o=>o.textContent)`);
if ((subjects || []).length !== 7)
  fail(`subject list has ${subjects?.length} options, expected the 6 services plus one`);
else pass(`subject list: ${subjects.join(", ")}`);

/* Empty submit through the e-mail button: it must raise errors and must not
   hand a half-filled enquiry to any channel. Clicked while empty on purpose —
   a mailto: navigation would take the page out from under the run. Three
   messages, not four: the subject select opens on the first service, so it is
   never empty and has nothing to complain about. */
await ev(`document.querySelector("#contact-form form button[type=button]").click()`);
await sleep(700);
const errs = await ev(`[...document.querySelectorAll('#contact-form [role="alert"]')].map(p=>p.textContent.trim())`);
if ((errs || []).length !== 3) fail(`empty submit raised ${errs?.length} errors, expected 3 (name, e-mail, message)`);
else pass(`empty submit is refused: ${errs.join(" / ")}`);
const navigated = await ev(`location.pathname`);
if (navigated !== "/contact-us") fail(`empty submit navigated away to ${navigated}`);
else pass(`empty submit does not leave the page`);

await writeFile(`${OUT}\\contact-04-form-errors.png`, await shot());

/* Now fill it and take the WhatsApp path, with window.open stubbed so the run
   stays on the page. Values are set through React's own value setter so
   react-hook-form sees them exactly as it would a keystroke. */
await ev(`(()=>{
  window.__opened=null;
  window.open=(u)=>{window.__opened=u; return {focus(){}};};
  const set=(id,v)=>{const el=document.getElementById(id);
    const proto=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:
      el.tagName==="SELECT"?HTMLSelectElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,"value").set.call(el,v);
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));};
  set("contact-name","QA Runner");
  set("contact-email","qa@example.com");
  set("contact-phone","+92 300 1234567");
  set("contact-subject","Photography");
  set("contact-message","Testing the enquiry composer end to end.");
})()`);
await sleep(500);
await ev(`document.querySelector("#contact-form form button[type=submit]").click()`);
await sleep(900);
const opened = await ev(`window.__opened`);
if (!opened) fail(`a valid submit opened nothing`);
else {
  const url = decodeURIComponent(opened);
  const checks = [
    ["wa.me/923312220136", "sends to the client's own WhatsApp number"],
    ["Name: QA Runner", "carries the name"],
    ["E-mail: qa@example.com", "carries the e-mail"],
    ["Phone: +92 300 1234567", "carries the phone"],
    ["Subject: Photography", "carries the subject"],
    ["Testing the enquiry composer end to end.", "carries the message"],
  ];
  for (const [needle, what] of checks) {
    if (url.includes(needle)) pass(what);
    else fail(`the composed WhatsApp message ${what.replace(/^carries/, "does not carry")} — got ${url.slice(0, 160)}`);
  }
}
const status = await ev(`document.querySelector('#contact-form [role="status"]')?.textContent.trim()`);
if (!status) fail(`nothing confirms the message was handed off`);
else pass(`confirmation shown: "${status}"`);
await writeFile(`${OUT}\\contact-05-form-sent.png`, await shot());

/* ── 4. the map ──────────────────────────────────────────────────────────── */
console.log("\nmap:");
const mapTop = await ev(`Math.round(document.querySelector("iframe").closest("section").offsetTop)`);
await scrollTo(mapTop + 120);
const map = await ev(`(()=>{const f=document.querySelector("iframe");
  if(!f) return null; const r=f.getBoundingClientRect();
  const s=f.closest("section");
  return {src:f.getAttribute("src"), title:f.getAttribute("title"),
    loading:f.getAttribute("loading"), h:Math.round(r.height),
    label:s.getAttribute("aria-label"), filter:getComputedStyle(f).filter.slice(0,40),
    shield:!!s.querySelector("button")};})()`);
if (!map) fail(`there is no map on the page`);
else {
  if (!/google\.com\/maps/.test(map.src)) fail(`map src is not a Google Maps embed: ${map.src}`);
  else pass(`Google Maps embed, keyless`);
  if (!decodeURIComponent(map.src).includes("410 Burhani Chamber"))
    fail(`map is not geocoded from the office address: ${map.src}`);
  else pass(`geocoded from the office address`);
  if (!map.title) fail(`the map iframe has no title — a screen reader announces "frame"`);
  else pass(`iframe title "${map.title}"`);
  if (map.loading !== "lazy") fail(`map iframe is not lazy-loaded`);
  else pass(`lazy-loaded`);
  if (map.h < 300) fail(`map is only ${map.h}px tall (legacy shortcode was 580)`);
  else pass(`${map.h}px tall`);
  if (!map.label) fail(`the map section has no accessible name`);
  else pass(`section labelled "${map.label}"`);
  if (map.filter === "none") fail(`map is unfiltered — a white slab in a dark page`);
  else pass(`tone filter applied: ${map.filter}…`);
  if (!map.shield) fail(`no shield over the map — the wheel will hijack page scroll`);
  else pass(`scroll shield present until the map is asked for`);
}

const dir = await ev(`(()=>{const a=document.querySelector('a[href*="maps/dir"]');
  if(!a) return null; const r=a.getBoundingClientRect();
  return {href:a.getAttribute("href"), label:a.textContent.trim(),
          h:Math.round(r.height), target:a.getAttribute("target")};})()`);
if (!dir) fail(`no "Get directions" link`);
else {
  if (!decodeURIComponent(dir.href).includes("410 Burhani Chamber"))
    fail(`directions link does not carry the office address`);
  else pass(`"${dir.label}" → maps/dir with the office as destination`);
  if (dir.h < 44) fail(`"${dir.label}" is ${dir.h}px tall — under the 44px touch target`);
  else pass(`"${dir.label}" clears the 44px touch target`);
  if (dir.target !== "_blank") fail(`directions link does not open in a new tab`);
  else pass(`opens in a new tab`);
}

/* Clicking the shield hands the map over. */
const shieldBox = await ev(`(()=>{const b=document.querySelector("iframe").closest("section").querySelector("button");
  if(!b) return null; const r=b.getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};})()`);
if (shieldBox) {
  for (const type of ["mousePressed", "mouseReleased"]) {
    await cmd("Input.dispatchMouseEvent", { type, x: shieldBox.x, y: shieldBox.y, button: "left", clickCount: 1 });
  }
  await sleep(700);
  const stillThere = await ev(`!!document.querySelector("iframe").closest("section").querySelector("button")`);
  if (stillThere) fail(`clicking the shield did not release the map`);
  else pass(`clicking the shield releases the map`);
}

/* ── 5. contrast, sampled from rendered pixels ───────────────────────────── */
const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

async function backdrop(rectSel) {
  const geo = await ev(`(()=>{const el=document.querySelector(${JSON.stringify(rectSel)});
    if(!el) return null; const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
    /* Tailwind v4 emits \`text-white/70\` as oklab(...), and pulling the numbers
       out of that string with a regex reads near-white as near-black. Resolve it
       on canvas instead: paint the colour over black and over white, solve
       a = 1 - (onWhite - onBlack)/255, then C = onBlack / a. */
    const read=(bg)=>{const cv=document.createElement("canvas");cv.width=cv.height=1;
      const x=cv.getContext("2d");x.fillStyle=bg;x.fillRect(0,0,1,1);
      x.fillStyle=cs.color;x.fillRect(0,0,1,1);return x.getImageData(0,0,1,1).data;};
    const bk=read("#000"), wh=read("#fff");
    const al=1-(wh[0]-bk[0])/255;
    const rgb=al<=0.001?[0,0,0]:[bk[0]/al,bk[1]/al,bk[2]/al];
    return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
            rad:parseFloat(cs.borderRadius)||0,
            rgb,alpha:al,size:parseFloat(cs.fontSize),weight:parseInt(cs.fontWeight,10)||400};})()`);
  if (!geo || geo.w < 4 || geo.h < 4) return null;

  /* Blank the glyphs rather than hiding the element. `visibility: hidden` takes
     the element's own plate away with its text, so a pill with a 72%-black
     backing was measured against the bare photograph behind it — a backdrop no
     glyph is ever drawn on. Setting every colour in the subtree to transparent
     leaves border, background and blur exactly where they are. */
  const blank = (on) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(rectSel)});
    if(!el) return; [el,...el.querySelectorAll("*")].forEach(n=>{
      if(${on}){ n.dataset.qaC=n.style.color||"\\u0000";
        n.style.setProperty("color","transparent","important");
        n.style.setProperty("-webkit-text-fill-color","transparent","important"); }
      else { n.style.removeProperty("color"); n.style.removeProperty("-webkit-text-fill-color");
        if(n.dataset.qaC && n.dataset.qaC!=="\\u0000") n.style.color=n.dataset.qaC;
        delete n.dataset.qaC; }});})()`);

  await blank(true);
  await sleep(260);
  const png = await shot();
  await blank(false);

  const meta = await sharp(png).metadata();
  const scale = meta.width / 1440;
  /* A rounded pill's bounding box includes four corners that lie outside the
     shape, so they show whatever is behind rather than the element's own plate.
     No glyph ever sits there, and on a short chip those corners are ~4% of the
     box — enough to own the 95th percentile and report a failure that is not
     one. Inset by the corner radius. Square elements are unaffected. */
  const pad = Math.min(geo.rad, geo.h / 2);
  const left = Math.max(0, Math.round((geo.x + pad) * scale));
  const top = Math.max(0, Math.round((geo.y + 1) * scale));
  const width = Math.min(meta.width - left, Math.round((geo.w - 2 * pad) * scale));
  const height = Math.min(meta.height - top, Math.round((geo.h - 2) * scale));
  if (width < 2 || height < 2) return null;

  const crop = sharp(png).extract({ left, top, width, height });
  const { data, info } = await crop.clone().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const lums = [];
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let i = 0; i < data.length; i += ch) {
    sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++;
    lums.push(L(data[i], data[i + 1], data[i + 2]));
  }
  lums.sort((p, q) => p - q);
  return { ...geo, crop, mean: { r: sr / n, g: sg / n, b: sb / n },
    meanL: L(sr / n, sg / n, sb / n), p95L: lums[Math.floor(lums.length * 0.95)] };
}

function ratioOf(rgb, alpha, bgL, bgMean) {
  const fg = {
    r: rgb[0] * alpha + bgMean.r * (1 - alpha),
    g: rgb[1] * alpha + bgMean.g * (1 - alpha),
    b: rgb[2] * alpha + bgMean.b * (1 - alpha),
  };
  const fgL = L(fg.r, fg.g, fg.b);
  return (Math.max(fgL, bgL) + 0.05) / (Math.min(fgL, bgL) + 0.05);
}

const cases = [
  { name: "hero h1 (gold)", y: 0, rect: "#contact-hero-heading" },
  { name: "hero breadcrumb", y: 0, rect: "[data-ct-crumb] a" },
  { name: "hero cta", y: 0, rect: 'a[href="#contact-form"]' },
  { name: "form h2", y: officeTop - 60, rect: "#contact-form-heading" },
  { name: "form intro", y: officeTop - 60, rect: "#contact-form-heading + p" },
  { name: "field label", y: officeTop - 60, rect: 'label[for="contact-name"]' },
  { name: "office h2", y: officeTop - 60, rect: "#contact-office-heading" },
  { name: "office row value", y: officeTop + 200, rect: "#contact-form aside li a span:last-child span:last-child" },
  { name: "map card eyebrow", y: mapTop + 120, rect: "[data-ct-map-eyebrow]" },
  { name: "map card address", y: mapTop + 120, rect: "[data-ct-map-address]" },
  { name: "map directions", y: mapTop + 120, rect: "a[href*='maps/dir']" },
];

console.log("\ncopy over its backdrop (sampled from rendered pixels):");
for (const c of cases) {
  await scrollTo(Math.max(0, c.y));
  const bd = await backdrop(c.rect);
  if (!bd) { console.log(`  ?     ${c.name} — not measurable at this offset`); continue; }
  const large = bd.size >= 24 || (bd.size >= 18.66 && bd.weight >= 700);
  const floor = large ? 3 : 4.5;
  const worst = ratioOf(bd.rgb, bd.alpha, bd.p95L, bd.mean);
  const avg = ratioOf(bd.rgb, bd.alpha, bd.meanL, bd.mean);
  const good = worst >= floor;
  if (!good) {
    ok = false;
    /* Keep the exact pixels a failure was read from — the difference between a
       real contrast defect and a mis-aimed crop is only visible by looking. */
    const file = `${OUT}\\contact-x-${c.name.replace(/\W+/g, "-")}.png`;
    await bd.crop.png().toFile(file);
    console.log(`        sampled region written to ${file}`);
  }
  console.log(`  ${good ? "PASS" : "FAIL"}  ${c.name.padEnd(20)} ${String(bd.size).padStart(5)}px/${bd.weight}` +
    `  mean ${avg.toFixed(2)}:1  p95 ${worst.toFixed(2)}:1  (floor ${floor})`);
}

/* ── 6. shots, then mobile ───────────────────────────────────────────────── */
console.log("\nshots:");
for (const [name, y] of [["01-hero", 0], ["02-form", officeTop - 60],
  ["03-office", officeTop + 320], ["06-map", mapTop + 120]]) {
  await scrollTo(Math.max(0, y));
  await sleep(700);
  await writeFile(`${OUT}\\contact-${name}.png`, await shot());
  console.log(`  shot  .qa\\contact-${name}.png`);
}

await scrollTo(officeTop + 200);
const hoverBox = await ev(`(()=>{const r=document.querySelector("#contact-form aside li a").getBoundingClientRect();
  return {x:Math.round(r.left+40), y:Math.round(r.top+r.height/2)};})()`);
await cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x: hoverBox.x, y: hoverBox.y, buttons: 0 });
await sleep(1200);
await writeFile(`${OUT}\\contact-07-row-hover.png`, await shot());
console.log(`  shot  .qa\\contact-07-row-hover.png`);

const over = await ev(`document.documentElement.scrollWidth - window.innerWidth`);
if (over > 1) fail(`horizontal overflow at 1440px: ${over}px`);
else pass(`no horizontal overflow at 1440px`);

await cmd("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
});
await sleep(1400);
await scrollTo(0);
await writeFile(`${OUT}\\contact-mobile-hero.png`, await shot());
await scrollTo(await ev(`Math.round(document.querySelector("#contact-form").offsetTop)`));
await sleep(900);
await writeFile(`${OUT}\\contact-mobile-form.png`, await shot());
await scrollTo(await ev(`Math.round(document.querySelector("iframe").closest("section").offsetTop)`));
await sleep(900);
await writeFile(`${OUT}\\contact-mobile-map.png`, await shot());
console.log(`  shot  .qa\\contact-mobile-hero.png, contact-mobile-form.png, contact-mobile-map.png`);

const overM = await ev(`document.documentElement.scrollWidth - window.innerWidth`);
if (overM > 1) fail(`horizontal overflow at 390px: ${overM}px`);
else pass(`no horizontal overflow at 390px`);

console.log(`\n${ok ? "PASS" : "FAIL"}  Contact Us`);
sock.close(); chrome.kill(); process.exit(ok ? 0 : 1);
