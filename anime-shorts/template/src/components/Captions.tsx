import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Word } from '../types';
import { captionFont } from './fonts';

const MAX_WORDS = 3;

// Dark caption colours (a spoken "black") need a light outline to read on the dark frame.
function isDark(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum < 0.3;
}

// Group words into short chunks, breaking after sentence punctuation.
function chunk(words: Word[]): Word[][] {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= MAX_WORDS || /[.!?…,]$/.test(w.text)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunks = chunk(words);
  const active = chunks.find((c, i) => frame >= c[0].from && frame < (chunks[i + 1]?.[0].from ?? c[c.length - 1].to + 8));
  if (!active) return null;
  return (
    <AbsoluteFill style={{ alignItems: 'center', top: 1240 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 26px', maxWidth: 980 }}>
        {active.map((w, i) => {
          const on = frame >= w.from;
          const speaking = on && frame < w.to + 2;
          const pop = spring({ frame: frame - w.from, fps, config: { damping: 10, stiffness: 220 }, durationInFrames: 8 });
          return (
            <span
              key={i}
              style={{
                fontFamily: captionFont,
                fontWeight: 900,
                fontSize: w.emphasis ? 112 : 92,
                lineHeight: 1.1,
                textTransform: 'uppercase',
                // A colour word keeps its own colour; otherwise emphasis is red and the spoken word yellow.
                color: w.color ?? (w.emphasis ? '#ff3b3b' : speaking ? '#ffe600' : '#fff'),
                WebkitTextStroke: `12px ${w.color && isDark(w.color) ? '#fff' : '#000'}`,
                paintOrder: 'stroke fill',
                textShadow: w.color && isDark(w.color) ? '0 0 28px rgba(255,255,255,0.55)' : '0 8px 24px rgba(0,0,0,0.6)',
                opacity: on ? 1 : 0,
                transform: `scale(${on ? 0.7 + pop * 0.3 : 0.7})`,
                display: 'inline-block',
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
