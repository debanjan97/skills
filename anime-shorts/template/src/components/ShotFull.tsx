import { AbsoluteFill, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Shot } from '../types';

// Full-bleed (channel style): the crop fills the 9:16 frame, no blurred backdrop, no border.
// Motion is a slow push with a slight drift; punch slams in; shake rumbles. A crop taller
// than 9:16 pans down it.
export const ShotFull: React.FC<{ shot: Shot; fx: Set<string> }> = ({ shot, fx }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const d = shot.durationInFrames;
  const src = staticFile(shot.src);

  const coverScale = Math.max(width / shot.w, height / shot.h);
  const w = shot.w * coverScale;
  const h = shot.h * coverScale;
  const tall = h > height * 1.08;

  let scale = 1;
  let x = 0;
  let y = 0;
  const dir = random(shot.src) > 0.5 ? 1 : -1;

  if (fx.has('punch')) {
    const s = spring({ frame, fps, config: { damping: 12, stiffness: 180 }, durationInFrames: 12 });
    scale = interpolate(s, [0, 1], [1.35, 1.0]) + interpolate(frame, [12, d], [0, 0.05], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  } else if (fx.has('push')) {
    scale = interpolate(frame, [0, d], [1.0, 1.14], { easing: Easing.inOut(Easing.quad) });
  } else {
    scale = interpolate(frame, [0, d], [1.03, 1.1]);
    x = interpolate(frame, [0, d], [-16 * dir, 16 * dir]);
  }
  if (tall) {
    const travel = h - height;
    y = interpolate(frame, [0, d], [travel / 2, -travel / 2], { easing: Easing.inOut(Easing.sin) });
  }

  const shakeAmp = fx.has('shake') ? 10 : fx.has('punch') ? interpolate(frame, [0, 14], [22, 0], { extrapolateRight: 'clamp' }) : 0;
  if (shakeAmp > 0) {
    x += (random(`x${frame}${shot.src}`) - 0.5) * 2 * shakeAmp;
    y += (random(`y${frame}${shot.src}`) - 0.5) * 2 * shakeAmp;
  }
  // Keep a little overscan so drift and shake never show an edge.
  const over = 1.04;

  return (
    <AbsoluteFill style={{ backgroundColor: '#fff', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      <Img
        src={src}
        style={{
          width: w,
          height: h,
          flexShrink: 0,
          transform: `translate(${x}px, ${y}px) scale(${scale * over})`,
        }}
      />
    </AbsoluteFill>
  );
};
