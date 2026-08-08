/* Pick a hero plate from the client's own stills: wide, dark enough for gold
   type, and high enough resolution to run full-bleed. Prints the shortlist and
   writes a contact sheet of the top candidates. Usage: node .qa/pick-hero.mjs */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const items = JSON.parse(await readFile(".qa/projects-gallery.json", "utf8"));

const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const scored = [];
for (const it of items) {
  const stats = await sharp(`public${it.src}`).stats();
  const [r, g, b] = stats.channels;
  const meanL = 0.2126 * lin(r.mean) + 0.7152 * lin(g.mean) + 0.0722 * lin(b.mean);
  scored.push({ ...it, meanL, ratio: it.width / it.height });
}

const wide = scored.filter((s) => s.ratio >= 1.4 && s.width >= 1000);
wide.sort((a, b) => a.meanL - b.meanL);

console.log("wide (>=1.4) and >=1000px, darkest first:\n");
for (const s of wide.slice(0, 14)) {
  console.log(
    `${s.src.padEnd(28)} ${String(s.width).padStart(4)}x${String(s.height).padEnd(4)}` +
      ` ratio ${s.ratio.toFixed(2)}  meanL ${s.meanL.toFixed(4)}`,
  );
}

const top = wide.slice(0, 12);
const cell = 320;
const tiles = await Promise.all(
  top.map((s) => sharp(`public${s.src}`).resize(cell, Math.round(cell * 0.62), { fit: "cover" }).toBuffer()),
);
await sharp({
  create: { width: cell * 4, height: Math.round(cell * 0.62) * 3, channels: 3, background: "#111" },
})
  .composite(
    tiles.map((input, i) => ({
      input,
      left: (i % 4) * cell,
      top: Math.floor(i / 4) * Math.round(cell * 0.62),
    })),
  )
  .png()
  .toFile(".qa/projects-hero-candidates.png");

console.log(`\ncontact sheet: .qa/projects-hero-candidates.png (reading order = list above)`);
