/* Client-side navigation QA: click every menu link, on desktop and on mobile,
   and fail on any uncaught exception.

   This suite exists because the per-page probes all reach their page with a hard
   Page.navigate, which is the one path that never exercised the router. A hero
   was calling onAppReady() from inside gsap.context()'s own initializer; on a
   cold load the curtain had not lifted yet so `start` was deferred past the
   hazard, but on a client-side nav the curtain is already up and `start` ran
   synchronously — while `ctx` was still in its temporal dead zone. Every menu
   click threw "Cannot access 'ctx' before initialization" and blanked the page.
   A cold load of that same URL looked perfect.

   Usage: node .qa/nav.mjs */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "F:\\xampp\\htdocs\\aruamzproductions\\.qa";
const BASE = "http://127.0.0.1:3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9444", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars",
  "--window-size=1440,900", `--user-data-dir=${OUT}\\cdp-nav`, "about:blank",
], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(400);
  try {
    const list = await (await fetch("http://127.0.0.1:9444/json/list")).json();
    target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  } catch {}
}
const sock = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });

let seq = 0;
const pending = new Map();
/* Everything the page threw, in order, with whatever frame the runtime gave us.
   Extensions are not loaded in this profile, so anything landing here is ours. */
const thrown = [];
sock.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Runtime.exceptionThrown") {
    const d = m.params.exceptionDetails;
    const top = d.stackTrace?.callFrames?.[0];
    thrown.push({
      text: d.exception?.description?.split("\n")[0] || d.text,
      at: top ? `${top.url.replace(BASE, "")}:${top.lineNumber + 1}` : "",
    });
  }
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
   every hero's animation path — and the reduced-motion branch returns before
   gsap.context() is ever reached, so the exact defect this suite is for would
   be invisible. The animated path has to be the one under test. */
await cmd("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});

let ok = true;
const fail = (m) => { ok = false; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  PASS  ${m}`);

/* Keyed by the heading each route actually prints. Two of these are not what a
   nav label would suggest and both are deliberate: the homepage sets its name
   as two stacked lines, which read back without the separating space, and the
   About hero is upper-case in the source copy. */
const PAGES = {
  "/": "ARUAMZPRODUCTIONS",
  "/about-us": "ABOUT US",
  "/our-services": "Work & Services",
  "/our-projects": "Our Projects",
  "/contact-us": "Contact Us",
};
const identify = `(()=>{const h=document.querySelector("main h1");
  return h?h.textContent.trim():null;})()`;

const clickLink = async (href, scope = "header") => {
  const box = await ev(`(()=>{const a=[...document.querySelectorAll(
      ${JSON.stringify(scope)}+' a[href="'+${JSON.stringify(href)}+'"]')]
      .find(x=>x.getBoundingClientRect().width>0);
    if(!a) return null; a.scrollIntoView({block:"center"});
    const r=a.getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};})()`);
  if (!box) return false;
  for (const type of ["mousePressed", "mouseReleased"]) {
    await cmd("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
  }
  await sleep(2600);
  return true;
};

/* ── 1. desktop: every menu link, from every page ────────────────────────── */
console.log("\nclient-side navigation (1440px):");
const routes = Object.keys(PAGES);
let checked = 0;

for (const from of routes) {
  await cmd("Page.navigate", { url: BASE + from });
  await sleep(7000);
  thrown.length = 0;

  for (const to of routes) {
    if (to === from) continue;
    const before = thrown.length;
    if (!(await clickLink(to))) { fail(`no visible header link to ${to} while on ${from}`); continue; }

    const path = await ev(`location.pathname`);
    const head = await ev(identify);
    const errs = thrown.slice(before);
    const label = `${from} → ${to}`.padEnd(30);

    if (errs.length) {
      fail(`${label} threw ${errs[0].text}  (${errs[0].at})`);
      await writeFile(`${OUT}\\nav-x-${to.replace(/\W+/g, "-")}.png`, await shot());
    } else if (path !== to) {
      fail(`${label} landed on ${path}`);
    } else if (head !== PAGES[to]) {
      fail(`${label} rendered "${head}", expected "${PAGES[to]}"`);
    } else {
      pass(`${label} clean, "${head}"`);
      checked++;
    }

    /* Walk back so the next hop starts from `from` again — and so the return
       leg is exercised too, which is where a torn-down context would show. */
    await clickLink(from);
    await sleep(400);
  }
}
console.log(`  ${checked}/20 hops clean`);

/* ── 2. the same links from inside the mobile drawer ─────────────────────── */
console.log("\nclient-side navigation (390px, drawer):");
await cmd("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
});
await cmd("Page.navigate", { url: BASE + "/" });
await sleep(7000);

for (const to of routes.slice(1)) {
  thrown.length = 0;
  const opened = await ev(`(()=>{const b=[...document.querySelectorAll("header button")]
      .find(x=>/menu/i.test(x.getAttribute("aria-label")||""));
    if(!b) return false; b.click(); return true;})()`);
  if (!opened) { fail(`no menu button at 390px`); break; }
  await sleep(900);

  if (!(await clickLink(to, "body"))) { fail(`drawer has no link to ${to}`); continue; }
  const path = await ev(`location.pathname`);
  const head = await ev(identify);
  if (thrown.length) fail(`drawer → ${to} threw ${thrown[0].text}  (${thrown[0].at})`);
  else if (path !== to) fail(`drawer → ${to} landed on ${path}`);
  else if (head !== PAGES[to]) fail(`drawer → ${to} rendered "${head}"`);
  else pass(`drawer → ${to} clean, "${head}"`);

  /* The drawer must not survive the navigation it triggered. */
  const stuck = await ev(`(()=>{const o=document.body.style.overflow;
    const d=[...document.querySelectorAll('[role="dialog"],[data-mobile-nav]')]
      .filter(n=>n.getBoundingClientRect().height>0).length;
    return {o,d};})()`);
  if (stuck?.d) fail(`the drawer is still open after navigating to ${to}`);
  if (stuck?.o === "hidden") fail(`scroll is still locked after navigating to ${to}`);

  await cmd("Page.navigate", { url: BASE + "/" });
  await sleep(6000);
}

/* ── 3. back/forward through the router ──────────────────────────────────── */
console.log("\nhistory:");
await cmd("Emulation.clearDeviceMetricsOverride");
await cmd("Page.navigate", { url: BASE + "/" });
await sleep(7000);
thrown.length = 0;
await clickLink("/our-services");
await clickLink("/contact-us");
await ev(`history.back()`);
await sleep(2600);
const backPath = await ev(`location.pathname`);
const backHead = await ev(identify);
if (thrown.length) fail(`back threw ${thrown[0].text}  (${thrown[0].at})`);
else if (backPath !== "/our-services") fail(`back landed on ${backPath}, expected /our-services`);
else if (backHead !== PAGES["/our-services"]) fail(`back rendered "${backHead}"`);
else pass(`back → /our-services clean, "${backHead}"`);

await ev(`history.forward()`);
await sleep(2600);
const fwdPath = await ev(`location.pathname`);
if (thrown.length) fail(`forward threw ${thrown[0].text}  (${thrown[0].at})`);
else if (fwdPath !== "/contact-us") fail(`forward landed on ${fwdPath}, expected /contact-us`);
else pass(`forward → /contact-us clean`);

/* ── 4. the heroes actually animated on the way in ───────────────────────── */
console.log("\nintro survives a client-side arrival:");
await cmd("Page.navigate", { url: BASE + "/" });
await sleep(7000);
await clickLink("/contact-us");
const intro = await ev(`(()=>{const t=document.querySelector("[data-ct-title]");
  const c=document.querySelector("[data-ct-cta]");
  if(!t||!c) return null;
  return {title:getComputedStyle(t).transform, cta:parseFloat(getComputedStyle(c).opacity),
          ready:document.documentElement.dataset.ready||""};})()`);
if (!intro) fail(`contact hero did not render after a client-side arrival`);
else {
  if (intro.ready !== "true") fail(`data-ready is "${intro.ready}" — the curtain never signalled`);
  else pass(`curtain already up on arrival (the case that used to throw)`);
  /* Settled means the timeline ran to completion rather than never starting:
     a from-tween that never ran would leave the CTA at opacity 1 too, so the
     transform is read as well — it must be back at identity, not mid-flight. */
  if (intro.cta < 0.99) fail(`hero CTA parked at opacity ${intro.cta} — the intro did not finish`);
  else if (/matrix/.test(intro.title) && intro.title !== "none" &&
           !/matrix\(1, 0, 0, 1, 0, 0\)/.test(intro.title)) {
    fail(`hero title parked at ${intro.title} — the intro did not finish`);
  } else pass(`hero intro ran and settled`);
}
await writeFile(`${OUT}\\nav-01-contact-after-click.png`, await shot());
console.log(`  shot  .qa\\nav-01-contact-after-click.png`);

console.log(`\n${ok ? "PASS" : "FAIL"}  client-side navigation`);
sock.close(); chrome.kill(); process.exit(ok ? 0 : 1);
