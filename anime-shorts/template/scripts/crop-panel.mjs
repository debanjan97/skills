#!/usr/bin/env node
// Manually crop one panel when the automatic cut got it wrong.
// Box values <= 1 are fractions of the page; larger values are pixels.
//
// Usage: node scripts/crop-panel.mjs --page pages/c1050/007.jpg --box 0,0.45,1,1 [--id c1050-p007-x1]
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({ options: { page: { type: 'string' }, box: { type: 'string' }, id: { type: 'string' } } });
if (!args.page || !args.box) {
  console.error('usage: crop-panel.mjs --page pages/<chapter>/<NNN>.<ext> --box x0,y0,x1,y1 [--id <id>]');
  process.exit(2);
}
const chapter = path.basename(path.dirname(args.page));
const pageNo = path.basename(args.page).replace(/\.[^.]+$/, '');
const { width: w, height: h } = await sharp(args.page).metadata();
const nums = args.box.split(',').map(Number);
const frac = nums.every((v) => v <= 1);
const [x0, y0, x1, y1] = nums.map((v, i) => Math.round(frac ? v * (i % 2 ? h : w) : v));
const all = existsSync('panels.json') ? JSON.parse(await readFile('panels.json', 'utf8')) : {};
const list = (all[chapter] ??= []);
const id = args.id ?? `${chapter}-p${pageNo}-m${list.filter((p) => p.page === pageNo && p.manual).length + 1}`;
const src = `panels/${id}.png`;
await mkdir('public/panels', { recursive: true });
await sharp(args.page).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).png().toFile(path.join('public', src));
const entry = { id, chapter, page: pageNo, src, box: [x0, y0, x1, y1], w: x1 - x0, h: y1 - y0, whole: false, manual: true };
const at = list.findIndex((p) => p.id === id);
if (at >= 0) list[at] = entry;
else list.push(entry);
await writeFile('panels.json', JSON.stringify(all, null, 2));
console.log(`${id}: ${entry.w}x${entry.h} → public/${src}`);
