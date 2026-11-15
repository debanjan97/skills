#!/usr/bin/env node
// Level every voiceover take to the same loudness (EBU R128, default -16 LUFS), so
// a calm line followed by an intense one changes in tone, not in volume.
// Originals are kept in public/vo/raw/ and are the input on every rerun.
//
// Usage: node scripts/normalize-vo.mjs [--lufs -16]
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({ options: { lufs: { type: 'string', default: '-16' } } });
const dir = 'public/vo';
const raw = path.join(dir, 'raw');
mkdirSync(raw, { recursive: true });

for (const f of readdirSync(dir).filter((x) => x.endsWith('.mp3'))) {
  const original = path.join(raw, f);
  if (!existsSync(original)) copyFileSync(path.join(dir, f), original);
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-i', original,
    '-af', `loudnorm=I=${args.lufs}:TP=-1.5:LRA=11`,
    '-ar', '44100', '-b:a', '192k',
    path.join(dir, f),
  ]);
  console.log(`${f}: levelled to ${args.lufs} LUFS`);
}
