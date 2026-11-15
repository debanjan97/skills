#!/usr/bin/env node
// Draw every panel script.json uses, in beat order and labelled, into review/picks.png,
// so the user can check the selection at checkpoint 3 without opening each contact sheet.
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';

const script = JSON.parse(readFileSync('script.json', 'utf8'));
const panels = new Map(Object.values(JSON.parse(readFileSync('panels.json', 'utf8'))).flat().map((p) => [p.id, p]));
const W = 300;
const H = 400;
const LBL = 34;
const COLS = 6;
const GAP = 10;

const tiles = [];
for (const b of script.beats) {
  for (const id of b.panels) {
    const p = panels.get(id);
    if (!p) throw new Error(`beat ${b.id}: unknown panel ${id}`);
    const img = await sharp(`public/${p.src}`).resize(W, H, { fit: 'contain', background: '#1a1a1a' }).toBuffer();
    const label = `<svg width="${W}" height="${LBL}"><rect width="${W}" height="${LBL}" fill="#111"/><text x="8" y="23" font-family="Helvetica" font-size="17" font-weight="700" fill="#ffe600">${b.id}</text><text x="52" y="23" font-family="Helvetica" font-size="15" fill="#fff">${id}</text></svg>`;
    tiles.push(await sharp(img).extend({ bottom: LBL, background: '#111' }).composite([{ input: Buffer.from(label), top: H, left: 0 }]).png().toBuffer());
  }
}
const rows = Math.ceil(tiles.length / COLS);
mkdirSync('review', { recursive: true });
await sharp({ create: { width: COLS * (W + GAP) + GAP, height: rows * (H + LBL + GAP) + GAP, channels: 3, background: '#2a2a2a' } })
  .composite(tiles.map((t, i) => ({ input: t, left: GAP + (i % COLS) * (W + GAP), top: GAP + Math.floor(i / COLS) * (H + LBL + GAP) })))
  .png()
  .toFile('review/picks.png');
console.log(`${tiles.length} panels → review/picks.png`);
