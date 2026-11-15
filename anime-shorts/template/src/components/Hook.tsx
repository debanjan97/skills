import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { impactFont } from './fonts';

// The hook is fully visible on frame 0 and settles from a slight overshoot. It never fades
// in: a feed viewer decides in the first second or two, and frame 0 is what they see first.

export const Hook: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 200 }, durationInFrames: 10 });
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
          transform: `rotate(-2deg) scale(${interpolate(s, [0, 1], [1.12, 1])})`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
