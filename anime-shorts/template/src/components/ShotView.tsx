import { AbsoluteFill, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Shot } from '../types';

const PANEL_W = 1000;
const MAX_H = 1400; // taller than this at PANEL_W → pan down the panel instead of shrinking it; leaves room above for the hook

export const ShotView: React.FC<{ shot: Shot; fx: Set<string> }> = ({ shot, fx }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const d = shot.durationInFrames;
  const src = staticFile(shot.src);

  const naturalH = (shot.h / shot.w) * PANEL_W;
  const pan = fx.has('pan') || naturalH > MAX_H * 1.15;
  // Fit: full width; for very wide panels keep them big enough to read.
  const w = pan ? width : Math.min(PANEL_W, (MAX_H / naturalH) * PANEL_W);
  const h = (shot.h / shot.w) * w;

  let scale = 1;
  let x = 0;
  let y = 0;

  if (fx.has('punch')) {
    const s = spring({ frame, fps, config: { damping: 12, stiffness: 180 }, durationInFrames: 12 });
    scale = interpolate(s, [0, 1], [1.45, 1.0]) + interpolate(frame, [12, d], [0, 0.06], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  } else if (fx.has('push')) {
    scale = interpolate(frame, [0, d], [1.0, 1.3], { easing: Easing.in(Easing.quad) });
  } else if (!pan) {
    // Ken Burns: slow zoom with a slight drift; direction varies per panel.
    const dir = random(shot.src) > 0.5 ? 1 : -1;
    scale = interpolate(frame, [0, d], [1.02, 1.12]);
    x = interpolate(frame, [0, d], [-12 * dir, 12 * dir]);
  }
  // Cut-in: every shot settles from a tiny overshoot so cuts feel snappy.
  if (!fx.has('punch')) scale *= interpolate(frame, [0, 5], [1.06, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

  if (pan) {
    const travel = Math.max(0, h - height * 0.8);
    y = interpolate(frame, [0, d], [travel / 2, -travel / 2], { easing: Easing.inOut(Easing.sin) });
  }

  const shakeAmp = fx.has('shake') ? 14 : fx.has('punch') ? interpolate(frame, [0, 14], [26, 0], { extrapolateRight: 'clamp' }) : 0;
  if (shakeAmp > 0) {
    x += (random(`x${frame}${shot.src}`) - 0.5) * 2 * shakeAmp;
    y += (random(`y${frame}${shot.src}`) - 0.5) * 2 * shakeAmp;
  }

  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{ position: 'absolute', inset: -80, width: width + 160, height: height + 160, objectFit: 'cover', filter: 'blur(38px) brightness(0.32) contrast(1.1)' }}
      />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Img
          src={src}
          style={{
            width: w,
            height: h,
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
            boxShadow: pan ? 'none' : '0 30px 80px rgba(0,0,0,0.7)',
            outline: pan ? 'none' : '6px solid #fff',
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
