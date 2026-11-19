#!/usr/bin/env node
// Cut full-bleed crops (default 9:16) from captured pages, listed in crops.json:
//   { id, page: "c81/024", cx, y0, y1, aspect? }   cx/y0/y1 are page fractions.
// Width follows from the height and aspect, centred on cx and clamped to the page.
// Small crops are upscaled (Lanczos) so the short side reaches the frame, then lightly sharpened.
// Writes public/panels/<id>.png and registers each in panels.json under "crops".
import sharp from 'sharp';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const FRAME_W = 1080;
const FRAME_H = 1920;
const list = JSON.parse(await readFile('crops.json', 'utf8'));
const panels = JSON.parse(await readFile('panels.json', 'utf8'));
const out = [];

for (const c of list) {
  const [ch, n] = c.page.split('/');
  const file = (await readdir(path.join('pages', ch))).find((f) => f.startsWith(n + '.'));
  const src = path.join('pages', ch, file);
  const { width: W, height: H } = await sharp(src).metadata();
  const aspect = c.aspect ?? FRAME_W / FRAME_H;
  const top = Math.round(c.y0 * H);
  const h = Math.round((c.y1 - c.y0) * H);
  const w = Math.min(W, Math.round(h * aspect));
  const left = Math.max(0, Math.min(W - w, Math.round(c.cx * W - w / 2)));
  // Target size: fill the frame (or the card half) on the limiting side.
  const targetW = c.aspect ? FRAME_W : FRAME_W;
  const scale = Math.max(1, targetW / w);
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);
  const rel = `panels/${c.id}.png`;
  await sharp(src)
    .extract({ left, top, width: w, height: h })
    .resize(tw, th, { kernel: 'lanczos3' })
    .sharpen({ sigma: 0.6 })
    .png()
    .toFile(path.join('public', rel));
  out.push({ id: c.id, chapter: ch, page: n, src: rel, box: [left, top, left + w, top + h], w: tw, h: th, whole: false, manual: true, upscale: +scale.toFixed(2) });
  console.log(`${c.id.padEnd(14)} ${c.page}  ${w}x${h} → ${tw}x${th}  (x${scale.toFixed(2)})`);
}
panels.crops = out;
await writeFile('panels.json', JSON.stringify(panels, null, 2));
