#!/usr/bin/env node
// Join every beat's take (in script.json order) into words/all.mp3 with a gap between takes,
// and record each take's offset in words/offsets.json. Upload all.mp3 once and transcribe it
// once (one charge instead of one per beat); split-words.mjs then cuts the word list per beat.
// Use this whenever the takes were edited after generation (tighten-vo), since timings from
// the original speech nodes would no longer match.
//
// Usage: node scripts/join-vo.mjs [--gap 0.6]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({ options: { gap: { type: 'string', default: '0.6' } } });
const gap = Number(args.gap);
const ids = JSON.parse(readFileSync('script.json', 'utf8')).beats.map((b) => b.id);
mkdirSync('words', { recursive: true });

const offsets = {};
let t = 0;
const inputs = [];
let filter = '';
ids.forEach((id, i) => {
  const f = `public/vo/${id}.mp3`;
  const d = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
  offsets[id] = { start: +t.toFixed(3), dur: +d.toFixed(3) };
  t += d + gap;
  inputs.push('-i', f);
  filter += `[${i}:a]aresample=44100,apad=pad_dur=${gap}[a${i}];`;
});
filter += ids.map((_, i) => `[a${i}]`).join('') + `concat=n=${ids.length}:v=0:a=1[o]`;
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', filter, '-map', '[o]', '-b:a', '128k', 'words/all.mp3']);
writeFileSync('words/offsets.json', JSON.stringify(offsets, null, 1));
console.log(`words/all.mp3: ${t.toFixed(1)}s, ${statSync('words/all.mp3').size} bytes (pass this size to creative_create_asset_upload)`);
