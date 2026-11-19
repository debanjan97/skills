import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { Word } from '../types';
import { captionFont } from './fonts';

// Channel style: small, mid-screen, normal case, 2–3 words; the spoken word turns yellow.
// Colour words (a spoken "red") keep their own colour.
const MAX_WORDS = 3;

function isDark(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum < 0.3;
}

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

export const CaptionsSmall: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const chunks = chunk(words);
  const active = chunks.find((c, i) => frame >= c[0].from && frame < (chunks[i + 1]?.[0].from ?? c[c.length - 1].to + 8));
  if (!active) return null;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 16px', maxWidth: 760 }}>
        {active.map((w, i) => {
          const speaking = frame >= w.from && frame < w.to + 2;
          const dark = w.color ? isDark(w.color) : false;
          return (
            <span
              key={i}
              style={{
                fontFamily: captionFont,
                fontWeight: 800,
                fontSize: 64,
                lineHeight: 1.15,
                color: w.color ?? (speaking ? '#ffe600' : '#fff'),
                WebkitTextStroke: `9px ${dark ? '#fff' : '#000'}`,
                paintOrder: 'stroke fill',
                textShadow: '0 4px 10px rgba(0,0,0,0.75)',
                display: 'inline-block',
              }}
            >
              {w.text.replace(/[.,]$/, '')}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
