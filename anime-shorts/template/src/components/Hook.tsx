import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { impactFont } from './fonts';

export const Hook: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 95 }}>
      <div
        style={{
          fontFamily: impactFont,
          fontSize: 118,
          lineHeight: 1,
          color: '#fff',
          textAlign: 'center',
          maxWidth: 960,
          WebkitTextStroke: '14px #000',
          paintOrder: 'stroke fill',
          textTransform: 'uppercase',
          letterSpacing: 2,
          transform: `translateY(${interpolate(s, [0, 1], [-60, 0])}px) rotate(-2deg) scale(${interpolate(s, [0, 1], [0.8, 1])})`,
          opacity: s,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
