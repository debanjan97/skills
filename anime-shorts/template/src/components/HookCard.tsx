import { AbsoluteFill, Img, staticFile } from 'remotion';
import { cardFont } from './fonts';

// Channel-style opening frame: two panels stacked, a two-line title on the seam
// (white, then yellow). Shown for a couple of frames only: it is the Short's thumbnail.
export const HookCard: React.FC<{ top: string; bottom: string; lines: string[] }> = ({ top, bottom, lines }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Img src={staticFile(top)} style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 960, objectFit: 'cover' }} />
    <Img src={staticFile(bottom)} style={{ position: 'absolute', top: 960, left: 0, width: 1080, height: 960, objectFit: 'cover' }} />
    <div style={{ position: 'absolute', top: 954, left: 0, width: 1080, height: 12, background: '#000' }} />
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily: cardFont,
            fontSize: 118,
            lineHeight: 1.02,
            color: i % 2 === 0 ? '#fff' : '#ffe600',
            WebkitTextStroke: '16px #000',
            paintOrder: 'stroke fill',
            textShadow: '0 10px 0 #000',
            textAlign: 'center',
            maxWidth: 1040,
            letterSpacing: 1,
          }}
        >
          {l}
        </div>
      ))}
    </AbsoluteFill>
  </AbsoluteFill>
);
