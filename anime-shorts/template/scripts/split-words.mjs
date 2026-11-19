#!/usr/bin/env node
// Split one transcript of words/all.mp3 (from join-vo.mjs) into words/<beat>.json, with
// timings relative to each take. Reports the word count per beat next to the script's, so a
// mis-split shows at once.
//
// Usage: node scripts/split-words.mjs [--in words/all.words.json] [--fix "seventy-nine=79,..."]
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: { in: { type: 'string', default: 'words/all.words.json' }, fix: { type: 'string', default: '' } },
});
// Spoken-form → caption-form replacements, e.g. numbers the transcriber spells out.
const fix = Object.fromEntries(args.fix.split(',').filter(Boolean).map((kv) => kv.split('=')));
const raw = JSON.parse(readFileSync(args.in, 'utf8'));
const words = (Array.isArray(raw) ? raw : raw.words ?? []).filter((w) => (w.type ?? 'word') === 'word');
const offsets = JSON.parse(readFileSync('words/offsets.json', 'utf8'));
const script = JSON.parse(readFileSync('script.json', 'utf8'));
const spoken = (l) => (l ?? '').replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter(Boolean).length;

for (const beat of script.beats) {
  const o = offsets[beat.id];
  if (!o) continue;
  const out = words
    .filter((w) => w.start >= o.start - 0.05 && w.start < o.start + o.dur + 0.3)
    .map((w) => {
      let text = (w.text ?? w.word).replace(/["“”]/g, '');
      const core = text.replace(/[.,!?]+$/, '');
      if (fix[core.toLowerCase()]) text = fix[core.toLowerCase()] + text.slice(core.length);
      return { text, start: +(w.start - o.start).toFixed(3), end: +(w.end - o.start).toFixed(3) };
    });
  writeFileSync(`words/${beat.id}.json`, JSON.stringify(out));
  const want = spoken(beat.line);
  console.log(`${beat.id}: ${out.length} words${out.length === want ? '' : `  ← script has ${want}`}`);
}
