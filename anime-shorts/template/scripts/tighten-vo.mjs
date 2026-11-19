#!/usr/bin/env node
// Tighten every take for a fast, continuous read (the inknarrator style runs ~3.1–3.4 words/s;
// ElevenLabs v4 has no speed setting and reads ~2.5). Pauses longer than --pause are cut down
// to --pause, then the take is time-stretched by --tempo (pitch kept).
// Originals are copied once to public/vo/orig/ and are the input on every rerun.
// Run normalize-vo.mjs after this one (it re-captures the tightened takes).
//
// Usage: node scripts/tighten-vo.mjs [--tempo 1.2] [--pause 0.15] [--keep b13=0.28,...]
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    tempo: { type: 'string', default: '1.2' },
    pause: { type: 'string', default: '0.15' },
    // Per-beat pause override, for a beat whose pauses are the point ("Arm gone. Eyes gone.").
    keep: { type: 'string', default: '' },
  },
});
const keep = Object.fromEntries(args.keep.split(',').filter(Boolean).map((kv) => kv.split('=')));
const dir = 'public/vo';
const orig = path.join(dir, 'orig');
mkdirSync(orig, { recursive: true });

let total = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.mp3'))) {
  const src = path.join(orig, f);
  if (!existsSync(src)) copyFileSync(path.join(dir, f), src);
  const p = keep[f.replace(/\.mp3$/, '')] ?? args.pause;
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-i', src,
    '-af', `silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.03:stop_periods=-1:stop_duration=${p}:stop_threshold=-40dB:stop_silence=${p},atempo=${args.tempo}`,
    '-ar', '44100', '-b:a', '192k', path.join(dir, f),
  ]);
  // normalize-vo keeps its own copy in raw/; drop it so it levels this new take.
  rmSync(path.join(dir, 'raw', f), { force: true });
  const d = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, f)]).toString());
  total += d;
  console.log(`${f}: ${d.toFixed(2)}s (pauses ≤${p}s, x${args.tempo})`);
}
console.log(`total voice: ${total.toFixed(1)}s`);
