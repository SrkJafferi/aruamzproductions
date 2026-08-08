/* Pull the Our Projects masonry out of the legacy export.
   Every gallery item is <a class="qode-aig-lightbox" href="<full size>"> wrapping
   an <img src="<masonry crop>" width height>. Usage: node .qa/extract-projects.mjs */
import { readFile } from "node:fs/promises";

const html = await readFile("_reference/Our_project_code.txt", "utf8");

const block = html.slice(
  html.indexOf("qode-advanced-image-gallery"),
  html.indexOf("qode-advanced-image-gallery") + 200000,
);

const items = [];
const re = /class="qode-aig-lightbox"\s+href="([^"]+)"[\s\S]{0,400}?<img[^>]*?src="([^"]+)"[^>]*?>/g;
let m;
while ((m = re.exec(block))) {
  const tag = m[0];
  const w = /width="(\d+)"/.exec(tag)?.[1];
  const h = /height="(\d+)"/.exec(tag)?.[1];
  const alt = /alt="([^"]*)"/.exec(tag)?.[1] ?? null;
  const title = /title="([^"]*)"/.exec(tag)?.[1] ?? null;
  items.push({ full: m[1], thumb: m[2], w: w && +w, h: h && +h, alt, title });
}

const mode = process.argv[2] ?? "list";

if (mode === "list") {
  items.forEach((it, i) => {
    console.log(
      `${String(i + 1).padStart(2, "0")}  ${String(it.w).padStart(4)}x${String(it.h).padEnd(4)}  ` +
        `${it.full.split("/").pop()}`,
    );
  });
  console.log(`\n${items.length} gallery items`);
  console.log(`unique full-size urls: ${new Set(items.map((i) => i.full)).size}`);
  console.log(`non-empty alts: ${items.filter((i) => i.alt).length}`);
  console.log(`captions/titles: ${new Set(items.map((i) => i.title)).size} distinct`);
}

if (mode === "urls") items.forEach((it) => console.log(it.full));

if (mode === "json") console.log(JSON.stringify(items, null, 2));

if (mode === "flow") {
  const heads = [...html.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/g)]
    .map((x) => `${x[1].toUpperCase()} ${x[2].replace(/<[^>]+>/g, "").trim()}`)
    .filter((x) => x.length > 4);
  heads.forEach((h) => console.log(h));
}

if (mode === "facts") {
  const nums = [...html.matchAll(/data-(?:start|end)-digit="(\d+)"|<span[^>]*counter[^>]*>([^<]*)</g)];
  console.log(nums.map((n) => n[1] ?? n[2]).join(" | "));
}
