#!/usr/bin/env node
// Cut captured manga pages into panels and draw a contact sheet for review.
//
// Method: recursive XY-cut. A "gutter" is a run of rows (or columns) whose
// pixels are nearly all the page's background colour (white on most manga,
// black on some). Split the page at horizontal gutters, split each band at
// vertical gutters, and repeat a few levels deep. This handles the usual grid
// layouts and long webtoon strips. It fails on art that crosses the gutters
// and on full-page spreads; those come out as one big "whole" panel, flagged
// on the contact sheet for a manual crop.
//
// Usage: node scripts/cut-panels.mjs [--chapters c1050,c1051] [--min-area 0.04]
// Reads  pages/<chapter>/NNN.*
// Writes public/panels/<chapter>-pNNN-K.png, panels.json, review/<chapter>.png
import sharp from 'sharp';
import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    chapters: { type: 'string' },
    'min-area': { type: 'string', default: '0.04' },
  },
});
const MIN_AREA = Number(args['min-area']);
const TOL = 28; // how far from the background a pixel may be and still count as gutter
const GUTTER_FILL = 0.985; // share of a line that must be background
const MAX_DEPTH = 5;

const chapters = args.chapters
  ? args.chapters.split(',')
  : (await readdir('pages', { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();

await mkdir('public/panels', { recursive: true });
await mkdir('review', { recursive: true });

function background(px, w, h) {
  // Median of the outermost 1% border ring.
  const ring = [];
  const b = Math.max(2, Math.round(Math.min(w, h) * 0.01));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (x < b || y < b || x >= w - b || y >= h - b) ring.push(px[y * w + x]);
    }
  }
  ring.sort((a, c) => a - c);
  const median = ring[Math.floor(ring.length / 2)];
  // Full-bleed art (a splash page) has no plain margin. Art often touches one or two
  // edges of an ordinary page, so only call it full-bleed when most of the ring is art.
  const plain = ring.filter((v) => Math.abs(v - median) <= TOL).length / ring.length;
  return { bg: median, fullBleed: plain < 0.5 };
}

function lineIsGutter(px, w, bg, fixed, from, to, horizontal) {
  let ok = 0;
  for (let i = from; i < to; i += 1) {
    const v = horizontal ? px[fixed * w + i] : px[i * w + fixed];
    if (Math.abs(v - bg) <= TOL) ok += 1;
  }
  return ok / (to - from) >= GUTTER_FILL;
}

// Split [lo, hi) along one axis at gutter runs at least minGap long.
function split(px, w, bg, box, horizontal, minGap) {
  const [x0, y0, x1, y1] = box;
  const lo = horizontal ? y0 : x0;
  const hi = horizontal ? y1 : x1;
  const isGap = [];
  for (let i = lo; i < hi; i += 1) {
    isGap.push(horizontal ? lineIsGutter(px, w, bg, i, x0, x1, true) : lineIsGutter(px, w, bg, i, y0, y1, false));
  }
  // Content segments = maximal runs of non-gap lines, merged across gaps shorter than minGap.
  const segs = [];
  let start = -1;
  let gapRun = 0;
  for (let i = 0; i < isGap.length; i += 1) {
    if (!isGap[i]) {
      if (start < 0) start = i;
      gapRun = 0;
    } else if (start >= 0) {
      gapRun += 1;
      if (gapRun >= minGap) {
        segs.push([start, i - gapRun + 1]);
        start = -1;
        gapRun = 0;
      }
    }
  }
  if (start >= 0) segs.push([start, isGap.length - gapRun]);
  return segs.map(([a, c]) => (horizontal ? [x0, y0 + a, x1, y0 + c] : [x0 + a, y0, x0 + c, y1]));
}

function xyCut(px, w, h, bg, box, depth, horizontal, minGap) {
  const parts = split(px, w, bg, box, horizontal, minGap);
  if (parts.length <= 1) {
    const only = parts[0] ?? box;
    if (depth === 0) return xyCut(px, w, h, bg, only, depth + 1, !horizontal, minGap);
    // Try the other axis once more before declaring a leaf.
    const other = split(px, w, bg, only, !horizontal, minGap);
    if (other.length <= 1 || depth >= MAX_DEPTH) return [other[0] ?? only];
    return other.flatMap((b) => xyCut(px, w, h, bg, b, depth + 1, horizontal, minGap));
  }
  if (depth >= MAX_DEPTH) return parts;
  return parts.flatMap((b) => xyCut(px, w, h, bg, b, depth + 1, !horizontal, minGap));
}

const all = existsSync('panels.json') ? JSON.parse(await readFile('panels.json', 'utf8')) : {};

for (const chapter of chapters) {
  const dir = path.join('pages', chapter);
  const files = (await readdir(dir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
  const panels = [];
  const sheetTiles = [];

  for (const file of files) {
    const pageNo = file.replace(/\.[^.]+$/, '');
    const src = path.join(dir, file);
    const { data: px, info } = await sharp(src).greyscale().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const { bg, fullBleed } = background(px, w, h);
    const minGap = Math.max(5, Math.round(Math.min(w, h) * 0.008));

    const leaves = (fullBleed ? [[0, 0, w, h]] : xyCut(px, w, h, bg, [0, 0, w, h], 0, true, minGap))
      .filter(([x0, y0, x1, y1]) => ((x1 - x0) * (y1 - y0)) / (w * h) >= MIN_AREA);

    const pagePanels = [];
    for (const [k, [x0, y0, x1, y1]] of leaves.entries()) {
      const pad = Math.round(minGap / 2);
      const box = [Math.max(0, x0 - pad), Math.max(0, y0 - pad), Math.min(w, x1 + pad), Math.min(h, y1 + pad)];
      const id = `${chapter}-p${pageNo}-${k + 1}`;
      const out = `panels/${id}.png`;
      await sharp(src)
        .extract({ left: box[0], top: box[1], width: box[2] - box[0], height: box[3] - box[1] })
        .png()
        .toFile(path.join('public', out));
      const area = ((box[2] - box[0]) * (box[3] - box[1])) / (w * h);
      pagePanels.push({ id, chapter, page: pageNo, src: out, box, w: box[2] - box[0], h: box[3] - box[1], whole: area > 0.85 });
    }
    panels.push(...pagePanels);

    // Contact-sheet tile: the page at 360px wide with numbered boxes.
    const scale = 360 / w;
    const tileH = Math.round(h * scale);
    const rects = pagePanels
      .map((p, i) => {
        const [x0, y0, x1, y1] = p.box.map((v) => Math.round(v * scale));
        const colour = p.whole ? '#ff9800' : '#e53935';
        return `<rect x="${x0 + 1}" y="${y0 + 1}" width="${x1 - x0 - 2}" height="${y1 - y0 - 2}" fill="none" stroke="${colour}" stroke-width="3"/>
          <rect x="${x0 + 2}" y="${y0 + 2}" width="26" height="22" fill="${colour}"/>
          <text x="${x0 + 15}" y="${y0 + 18}" font-family="Helvetica" font-size="16" font-weight="700" fill="#fff" text-anchor="middle">${i + 1}</text>`;
      })
      .join('');
    const label = `<rect x="0" y="${tileH}" width="360" height="28" fill="#111"/><text x="8" y="${tileH + 20}" font-family="Helvetica" font-size="16" fill="#fff">p${pageNo} · ${pagePanels.length} panel(s)${pagePanels.some((p) => p.whole) ? ' · CHECK' : ''}</text>`;
    const tile = await sharp(src)
      .resize(360)
      .extend({ bottom: 28, background: '#111' })
      .composite([{ input: Buffer.from(`<svg width="360" height="${tileH + 28}">${rects}${label}</svg>`), top: 0, left: 0 }])
      .png()
      .toBuffer();
    sheetTiles.push({ buf: tile, h: tileH + 28 });
  }

  // Grid of tiles, 5 per row.
  const cols = 5;
  const gap = 12;
  const rows = [];
  for (let i = 0; i < sheetTiles.length; i += cols) rows.push(sheetTiles.slice(i, i + cols));
  const rowH = rows.map((r) => Math.max(...r.map((t) => t.h)));
  const sheetW = cols * 360 + (cols + 1) * gap;
  const sheetH = rowH.reduce((a, c) => a + c + gap, gap);
  const layers = [];
  let y = gap;
  rows.forEach((r, ri) => {
    r.forEach((t, ci) => layers.push({ input: t.buf, top: y, left: gap + ci * (360 + gap) }));
    y += rowH[ri] + gap;
  });
  if (layers.length) {
    await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#2a2a2a' } })
      .composite(layers)
      .png()
      .toFile(path.join('review', `${chapter}.png`));
  }

  all[chapter] = panels;
  const flagged = panels.filter((p) => p.whole).length;
  console.log(`${chapter}: ${files.length} pages → ${panels.length} panels (${flagged} flagged whole-page). Sheet: review/${chapter}.png`);
}

await writeFile('panels.json', JSON.stringify(all, null, 2));
