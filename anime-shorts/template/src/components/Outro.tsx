import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { captionFont, impactFont } from './fonts';

export const Outro: React.FC<{ series: string; author: string; readOn: string }> = ({ series, author, readOn }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: '#0b0b0b', justifyContent: 'center', alignItems: 'center', opacity: o, textAlign: 'center', padding: 60 }}>
      <div style={{ fontFamily: impactFont, fontSize: 130, color: '#fff', lineHeight: 1, textTransform: 'uppercase' }}>{series}</div>
      <div style={{ fontFamily: captionFont, fontWeight: 900, fontSize: 52, color: '#bbb', marginTop: 24 }}>by {author}</div>
      <div style={{ fontFamily: captionFont, fontWeight: 900, fontSize: 56, color: '#ffe600', marginTop: 90 }}>Read it officially on {readOn}</div>
    </AbsoluteFill>
  );
};
