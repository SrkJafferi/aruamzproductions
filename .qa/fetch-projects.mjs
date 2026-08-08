/* Bring the Our Projects gallery local.

   25 of the legacy page's 48 stills are already in public/projects (the homepage
   masonry pulled them first); this fetches only the 23 that are not, continues
   the existing project-NN numbering, and writes the whole 48 back out in the
   legacy page's own order with real on-disk dimensions.

   Usage: node .qa/fetch-projects.mjs */
import { execSync } from "node:child_process";
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import sharp from "sharp";

const masonry = JSON.parse(await readFile("_reference/masonry.json", "utf8"));
const assets = JSON.parse(await readFile("src/content/assets.json", "utf8"));
const local = assets.filter((a) => a.group === "projects");

/* masonry.json is the homepage gallery in source order and project-01..32 were
   written from it in that same order, so index is the join key. */
const byOrigin = new Map();
masonry.forEach((s, i) => {
  if (local[i]) byOrigin.set(decodeURIComponent(s.src.split("/").pop()), local[i]);
});

const urls = execSync("node .qa/extract-projects.mjs urls", { encoding: "utf8" })
  .trim()
  .split(/\r?\n/);

let next = local.length; // 32 → the next file is project-33
const out = [];
const added = [];

for (const url of urls) {
  const file = decodeURIComponent(url.split("/").pop());
  const hit = byOrigin.get(file);
  if (hit) {
    out.push({ src: hit.src, width: hit.width, height: hit.height, origin: file });
    continue;
  }

  next += 1;
  const ext = file.split(".").pop().toLowerCase();
  const key = `project-${String(next).padStart(2, "0")}`;
  const rel = `/projects/${key}.${ext}`;
  const abs = `public${rel}`;

  if (!existsSync(abs)) {
    console.log(`  fetch ${key}.${ext}  ←  ${file}`);
    execSync(`curl -sL --fail -o "${abs}" "${url}"`, { stdio: "inherit" });
  }
  const meta = await sharp(abs).metadata();
  out.push({ src: rel, width: meta.width, height: meta.height, origin: file });
  added.push({ key, group: "projects", src: rel, width: meta.width, height: meta.height });
}

/* Keep assets.json the single register of what ships in public/. */
if (added.length) {
  const lastProject = assets.map((a) => a.group).lastIndexOf("projects");
  assets.splice(lastProject + 1, 0, ...added);
  await writeFile("src/content/assets.json", `${JSON.stringify(assets, null, 2)}\n`);
}

await writeFile(".qa/projects-gallery.json", `${JSON.stringify(out, null, 2)}\n`);
console.log(`\n${out.length} stills in legacy order, ${added.length} newly fetched`);
console.log(`sizes: ${out.filter((o) => !o.width).length} unreadable`);
