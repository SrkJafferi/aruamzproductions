/* Pulls the Our Services page apart: headings, paragraphs and every image the
   page references, in document order. Read-only — nothing is written.
   Usage: node .qa/extract-services.mjs [what] */
import { readFile } from "node:fs/promises";

const SRC = "F:\\xampp\\htdocs\\aruamzproductions\\_reference\\our_services_code.txt";
let html = await readFile(SRC, "utf8");
html = html
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

const decode = (s) =>
  s
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&#8217;|&#8216;|&#039;/g, "'")
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

const text = (s) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

const what = process.argv[2] || "flow";

if (what === "flow") {
  const re = /<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(html))) {
    const t = text(m[2]);
    if (!t || t.length < 2) continue;
    const key = m[1] + t;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(m[1].toUpperCase().padEnd(3) + " | " + t);
  }
}

if (what === "images") {
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|data-src|href)="([^"]+\.(?:jpe?g|png|webp|gif|avif))"/gi)) {
    urls.add(m[1]);
  }
  for (const m of html.matchAll(/url\((?:&#0?39;|'|")?([^)'"]+\.(?:jpe?g|png|webp|gif|avif))/gi)) {
    urls.add(decode(m[1]));
  }
  console.log([...urls].join("\n"));
}

if (what === "cards") {
  /* The six service blocks: each is a heading followed by its own paragraph.
     Printed with the surrounding markup so the pairing can be checked by eye
     rather than assumed. */
  const re = /<h4\b[^>]*>([\s\S]*?)<\/h4>([\s\S]{0,1400}?)(?=<h4\b|$)/gi;
  let m;
  while ((m = re.exec(html))) {
    const head = text(m[1]);
    if (!head) continue;
    const body = [...m[2].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((p) => text(p[1]))
      .filter((t) => t && t.length > 15);
    const img = [...m[2].matchAll(/(?:src|url\()["'(]?([^"')]+\.(?:jpe?g|png|webp))/gi)]
      .map((i) => i[1].split("/").pop());
    console.log("\n### " + head);
    body.forEach((b) => console.log("    " + b));
    if (img.length) console.log("    img: " + [...new Set(img)].join(", "));
  }
}
