#!/usr/bin/env node
// Turn script.json (+ voiceover files and word timings) into src/timeline.json,
// the only input the Remotion composition reads.
//
// Per beat:
//   public/vo/<beatId>.mp3   optional voiceover take; its length sets the beat's length
//   words/<beatId>.json      optional word timings from ElevenLabs transcription
//                            (array of {text|word, start, end} in seconds, or {words: [...]})
// Without word timings the words of `line` are spread evenly over the beat.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { checkTransitions } from './delivery.mjs';
import { checkOpenAndClose } from './hook.mjs';

const FPS = 30;
const script = JSON.parse(await readFile('script.json', 'utf8'));
for (const p of checkTransitions(script.beats)) console.warn(`delivery: ${p}`);
{
  const { errors, warnings } = checkOpenAndClose(script);
  for (const p of [...errors, ...warnings]) console.warn(`hook: ${p}`);
}
const panelsByChapter = JSON.parse(await readFile('panels.json', 'utf8'));
const panels = new Map(Object.values(panelsByChapter).flat().map((p) => [p.id, p]));

const seconds = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());

// Seconds of silence at the start of a take. Only the opening take is trimmed by this:
// dead air before the first word is where a feed viewer swipes away.
function leadingSilence(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-35dB:d=0.08', '-f', 'null', '-'], { encoding: 'utf8' });
  const start = /silence_start: (-?[\d.]+)/.exec(r.stderr ?? '');
  const end = /silence_end: ([\d.]+)/.exec(r.stderr ?? '');
  return start && end && Number(start[1]) <= 0.02 ? Number(end[1]) : 0;
}

const stripTags = (s) => s.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
const clean = (w) => w.replace(/[^\p{L}\p{N}'!?.,…-]/gu, '');

function loadWords(beatId) {
  const f = `words/${beatId}.json`;
  if (!existsSync(f)) return null;
  const raw = JSON.parse(readFileSync(f, 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.words ?? [];
  return list
    .filter((w) => (w.type ?? 'word') === 'word')
    .map((w) => ({ text: (w.text ?? w.word ?? '').trim(), start: Number(w.start), end: Number(w.end) }))
    // The transcript keeps the v4 delivery tags ("[whispering]") as words; they are not spoken.
    .filter((w) => w.text && !/^\[[^\]]*\]$/.test(w.text));
}

const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

// A colour named in the voiceover is shown in that colour in the captions.
const COLOUR_WORDS = {
  red: '#ff2a2a', blue: '#2f8bff', purple: '#b24bff', violet: '#b24bff', black: '#0a0a0a', white: '#ffffff',
  green: '#2ecc40', yellow: '#ffe600', orange: '#ff8c1a', pink: '#ff4fa3', gold: '#ffc400', golden: '#ffc400',
  silver: '#c9c9c9', gray: '#9a9a9a', grey: '#9a9a9a', crimson: '#dc143c', scarlet: '#ff2400',
};

// Colour words get their colour. script.json can add or override per word or per phrase in
// `wordColors` (top level or per beat): "flash": "#e10600", or "black flash": ["#0a0a0a", "#e10600"]
// for one colour per word of the phrase. Phrases win over single words.
function colourWords(words, extra) {
  const keys = words.map((w) => norm(w.text));
  for (const [i, k] of keys.entries()) {
    const single = extra[k] ?? COLOUR_WORDS[k];
    if (typeof single === 'string') words[i].color = single;
  }
  for (const [phrase, colours] of Object.entries(extra)) {
    const parts = phrase.toLowerCase().split(/\s+/).map(norm);
    if (parts.length < 2) continue;
    for (let i = 0; i + parts.length <= keys.length; i += 1) {
      if (parts.every((p, j) => keys[i + j] === p)) {
        parts.forEach((_, j) => {
          const c = Array.isArray(colours) ? colours[j] : colours;
          if (c) words[i + j].color = c;
        });
      }
    }
  }
}

let cursor = 0;
const beats = [];
for (const beat of script.beats) {
  const vo = `vo/${beat.id}.mp3`;
  const hasVo = existsSync(`public/${vo}`);
  const timed = loadWords(beat.id);
  // The opening take starts on its first word: skip its leading silence (keeping 40ms so
  // the word's attack is not clipped), never past the first transcribed word.
  let trimSec = 0;
  if (hasVo && beats.length === 0) {
    trimSec = Math.max(0, leadingSilence(`public/${vo}`) - 0.04);
    if (timed?.length) trimSec = Math.min(trimSec, Math.max(0, timed[0].start));
  }
  const voTrim = Math.round(trimSec * FPS);
  const voSec = hasVo ? seconds(`public/${vo}`) - voTrim / FPS : null;
  const durSec = beat.seconds ?? (voSec !== null ? voSec + 0.25 : 2.5);
  const durationInFrames = Math.round(durSec * FPS);

  const ids = beat.panels ?? [];
  if (!ids.length) throw new Error(`beat ${beat.id} has no panels`);
  const shotDur = Math.floor(durationInFrames / ids.length);
  const shots = ids.map((id, i) => {
    const p = panels.get(id);
    if (!p) throw new Error(`beat ${beat.id}: unknown panel ${id} (see panels.json)`);
    return {
      src: p.src,
      w: p.w,
      h: p.h,
      from: i * shotDur,
      durationInFrames: i === ids.length - 1 ? durationInFrames - i * shotDur : shotDur,
    };
  });

  const emphasis = new Set((beat.emphasis ?? []).map((w) => w.toLowerCase()));
  let words;
  if (timed?.length) {
    words = timed.map((w) => ({
      text: clean(w.text),
      from: Math.max(0, Math.round(w.start * FPS) - voTrim),
      to: Math.max(1, Math.round(w.end * FPS) - voTrim),
    }));
  } else {
    const list = stripTags(beat.caption ?? beat.line ?? '').split(' ').filter(Boolean);
    const speak = voSec ?? durSec * 0.9;
    const per = (speak * FPS) / Math.max(1, list.length);
    words = list.map((t, i) => ({ text: clean(t), from: Math.round(i * per), to: Math.round((i + 1) * per) }));
  }
  words = words.filter((w) => w.text).map((w) => ({ ...w, emphasis: emphasis.has(norm(w.text)) }));
  colourWords(words, { ...(script.wordColors ?? {}), ...(beat.wordColors ?? {}) });

  beats.push({
    id: beat.id,
    from: cursor,
    durationInFrames,
    effect: beat.effect ?? 'kenburns',
    hook: beat.hook ?? null,
    vo: hasVo ? vo : null,
    voTrim,
    shots,
    words,
  });
  cursor += durationInFrames;
}

// No end card by default: a Short loops, and a credit card at the end breaks the loop
// (user feedback). The credit runs as a small line along the bottom instead (creditLine).
const outroFrames = Math.round((script.outroSeconds ?? 0) * FPS);
const timeline = {
  fps: FPS,
  width: 1080,
  height: 1920,
  title: script.title,
  music: existsSync('public/music.mp3') ? { src: 'music.mp3', volume: script.musicVolume ?? 0.12 } : null,
  beats,
  outro: { from: cursor, durationInFrames: outroFrames, series: script.series, author: script.author, readOn: script.readOn },
  creditLine: script.creditLine === false ? null : `${script.series} · ${script.author} · read it on ${script.readOn}`,
  durationInFrames: cursor + outroFrames,
};
await writeFile('src/timeline.json', JSON.stringify(timeline, null, 2));
if (beats[0]?.voTrim) console.log(`opening take: skipped ${(beats[0].voTrim / FPS).toFixed(2)}s of leading silence`);
console.log(`timeline: ${beats.length} beats, ${(timeline.durationInFrames / FPS).toFixed(1)}s total${timeline.music ? ', with music' : ''}`);
