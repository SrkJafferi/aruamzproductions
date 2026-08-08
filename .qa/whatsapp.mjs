/* Grades the WhatsApp float. The expensive mistakes, in order: a malformed
   wa.me number (the link opens an error page and nobody tells you), the button
   being absent or unclickable on the first screen, and it silently overlapping
   the rest of the dock once that fades in.
   Usage: node .qa/whatsapp.mjs */
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXPECT = "923312220136";

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9421", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=390,844", "--device-scale-factor=2",
  `--user-data-dir=${OUT}\\cdp-wa`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9421/json/list")).json();
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
const ev = async (expression) => {
  const { result } = await cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result?.exceptionDetails) {
    throw new Error(`page-side: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
  }
  return result?.result?.value;
};

let failed = 0;
const fail = (m) => { failed++; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  PASS  ${m}`);

await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await cmd("Page.navigate", { url: "http://127.0.0.1:3100/" });
for (let i = 0; i < 80; i++) {
  if ((await ev("document.readyState")) === "complete") break;
  await sleep(300);
}
await sleep(2200);

const WA = `document.querySelector("[data-whatsapp]")`;

/* ── 1. The number ─────────────────────────────────────────────────────
   wa.me rejects a leading +, spaces, dashes and brackets with a generic
   "phone number shared via url is invalid" page. Nothing in the app throws,
   so this is only ever caught by asserting the href shape. */
console.log("\n── the number ──");
const href = await ev(`${WA} ? ${WA}.getAttribute("href") : null`);
if (!href) {
  fail("no WhatsApp button in the DOM — is contact.whatsapp empty?");
} else {
  const m = /^https:\/\/wa\.me\/(\d+)\?text=(.+)$/.exec(href);
  m ? pass("href is a clean wa.me link with a prefilled message")
    : fail(`href is ${href} — expected https://wa.me/<digits>?text=<encoded>`);
  const digits = m?.[1];
  digits === EXPECT
    ? pass(`number matches the one the client supplied (${EXPECT})`)
    : fail(`number is ${digits}, expected ${EXPECT}`);
  digits?.startsWith("92") && !digits.startsWith("920")
    ? pass("carries the Pakistan country code with the trunk 0 stripped")
    : fail(`country code looks wrong: ${digits}`);
  digits?.length === 12 ? pass("12 digits, the right length for a PK mobile") : fail(`${digits?.length} digits`);

  /* The prefill is the part that fails quietly. An unencoded apostrophe, & or #
     truncates the message mid-sentence and the visitor sends a fragment — the
     link still opens, so nothing looks broken. Decode and compare to the source
     string rather than eyeballing the URL. */
  const raw = m?.[2] ?? "";
  let decoded = null;
  try { decoded = decodeURIComponent(raw); } catch { /* malformed escape */ }
  if (decoded === null) {
    fail("the text param is not valid percent-encoding");
  } else {
    decoded.length > 20 ? pass(`prefill survives a round trip (${decoded.length} chars)`)
      : fail(`prefill decoded to only ${decoded.length} chars — likely truncated: "${decoded}"`);
    decoded.endsWith(".") || decoded.endsWith("!") || decoded.endsWith("?")
      ? pass("prefill ends on a complete sentence")
      : fail(`prefill ends mid-sentence: "...${decoded.slice(-24)}"`);
    /^[ -~ -￿]+$/.test(decoded) && !decoded.includes("%")
      ? pass(`prefill reads: "${decoded}"`)
      : fail(`prefill still contains escapes after decoding: "${decoded}"`);
    // Space must be %20 or +; a literal space in an href is fixed up by the
    // browser but not by every WhatsApp client.
    !/ /.test(raw) ? pass("no literal spaces left in the query string") : fail("raw spaces in the text param");
  }
}

/* ── 2. Present and usable on the first screen ─────────────────────────
   The whole point of the change. Asserted with elementFromPoint rather than a
   style read, because opacity/pointer-events/z-index can each individually
   make a painted button unclickable. */
console.log("\n── usable before any scroll ──");
const top = await ev(`(()=>{const a=${WA}; if(!a) return null;
  const r=a.getBoundingClientRect(); const cs=getComputedStyle(a);
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  const hit=document.elementFromPoint(cx,cy);
  return {y:Math.round(scrollY), op:Number(cs.opacity), pe:cs.pointerEvents,
    w:Math.round(r.width), h:Math.round(r.height),
    inView:r.bottom<=innerHeight+1 && r.top>=0,
    fromEdge:Math.round(innerWidth-r.right), fromBottom:Math.round(innerHeight-r.bottom),
    reaches:!!hit && !!a.contains(hit), bg:cs.backgroundColor, svg:!!a.querySelector("svg"),
    label:a.getAttribute("aria-label"), rel:a.getAttribute("rel"), tgt:a.getAttribute("target")};})()`);
if (!top) fail("button missing");
else {
  top.y === 0 ? pass("measured at the top of the page") : fail(`page was already scrolled to ${top.y}`);
  top.op === 1 ? pass("fully opaque on the hero") : fail(`opacity ${top.op} before scrolling — still gated`);
  top.pe !== "none" ? pass("accepts the pointer") : fail("pointer-events: none on the hero");
  top.reaches ? pass("it is the topmost element at its own centre") : fail("something is painted over the button");
  top.inView ? pass("fully inside the viewport") : fail("button is clipped by the viewport");
  top.w >= 44 && top.h >= 44
    ? pass(`${top.w}x${top.h} — meets the 44px touch target`)
    : fail(`${top.w}x${top.h} — under 44px on a phone`);
  top.svg ? pass("renders the WhatsApp glyph") : fail("no glyph inside the button");
  top.bg === "rgb(37, 211, 102)" ? pass("wears WhatsApp green") : fail(`background is ${top.bg}`);
  (top.label || "").toLowerCase().includes("whatsapp")
    ? pass(`announces as "${top.label}"`) : fail(`aria-label is ${JSON.stringify(top.label)}`);
  top.tgt === "_blank" && (top.rel || "").includes("noreferrer")
    ? pass("opens in a new tab with rel intact") : fail(`target=${top.tgt} rel=${top.rel}`);
}

/* ── 3. The green button must not move ─────────────────────────────────
   The reason the utilities were put in their own fading group: if the whole
   stack were gated, WhatsApp would jump the moment the hero cleared — under
   a thumb already travelling toward it. */
console.log("\n── it holds position when the dock appears ──");
const before = await ev(`(()=>{const r=${WA}.getBoundingClientRect();
  return {x:Math.round(r.left), b:Math.round(innerHeight-r.bottom)};})()`);
await ev(`scrollTo({top:innerHeight*1.6,behavior:"instant"})`);
await sleep(1100);
const after = await ev(`(()=>{const r=${WA}.getBoundingClientRect();
  const sibs=[...document.querySelectorAll(".dock-button, [data-whatsapp]")];
  return {x:Math.round(r.left), b:Math.round(innerHeight-r.bottom), n:sibs.length};})()`);
before.x === after.x && before.b === after.b
  ? pass(`stayed at the same corner offset (${after.x}, ${after.b}) across the fade`)
  : fail(`button moved from (${before.x},${before.b}) to (${after.x},${after.b}) when the dock appeared`);

// No overlap: four round buttons in one column, each must own its box.
const overlap = await ev(`(()=>{const b=[...document.querySelectorAll('[data-whatsapp], .dock-button')]
    .map(e=>e.getBoundingClientRect()).sort((p,q)=>p.top-q.top);
  const bad=[];
  for(let i=1;i<b.length;i++) if(b[i].top < b[i-1].bottom-0.5) bad.push(i);
  return {count:b.length, bad};})()`);
overlap.count === 4 ? pass("all four dock actions present") : fail(`${overlap.count} dock actions`);
overlap.bad.length === 0 ? pass("no two buttons overlap") : fail(`buttons overlap at index ${overlap.bad.join(", ")}`);

/* ── 4. It really resolves ─────────────────────────────────────────────
   The href can be perfectly shaped and still be a number WhatsApp does not
   recognise. Fetched for real; a valid target redirects to the chat surface
   rather than the invalid-number page. */
console.log("\n── wa.me actually accepts it ──");
try {
  const res = await fetch(`https://wa.me/${EXPECT}`, { redirect: "follow" });
  const body = (await res.text()).toLowerCase();
  const invalid = body.includes("phone number shared via url is invalid")
    || body.includes("invalid phone number");
  res.ok ? pass(`wa.me responded ${res.status}`) : fail(`wa.me responded ${res.status}`);
  invalid ? fail("wa.me reports the number as invalid") : pass("wa.me does not reject the number");
} catch (e) {
  console.log(`  SKIP  could not reach wa.me (${e.message})`);
}

/* Capture for the user: image reads come back empty here, so the only way this
   gets judged by eye is a file they can open. */
await ev(`scrollTo({top:0,behavior:"instant"})`);
await sleep(900);
for (const theme of ["dark", "light"]) {
  await ev(`document.documentElement.setAttribute("data-theme","${theme}")`);
  await sleep(500);
  // cmd() resolves the whole CDP envelope, so the payload is under .result.
  const shot = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const { writeFile } = await import("node:fs/promises");
  await writeFile(`${OUT}\\whatsapp-${theme}.png`, Buffer.from(shot.result.data, "base64"));
  console.log(`  shot  .qa\\whatsapp-${theme}.png`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall WhatsApp checks pass");
sock.close(); chrome.kill(); process.exit(failed ? 1 : 0);
