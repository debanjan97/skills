import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';

// Radial manga speed lines, redrawn every 2 frames so they flicker.
export const SpeedLines: React.FC<{ seed: string }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tick = Math.floor(frame / 2);
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.hypot(width, height);
  const lines = Array.from({ length: 90 }, (_, i) => {
    const a = random(`${seed}a${i}${tick}`) * Math.PI * 2;
    const inner = R * (0.28 + random(`${seed}r${i}${tick}`) * 0.18);
    const spread = 0.004 + random(`${seed}s${i}${tick}`) * 0.012;
    const p = (ang: number, r: number) => `${cx + Math.cos(ang) * r},${cy + Math.sin(ang) * r}`;
    return `M${p(a, inner)} L${p(a - spread, R)} L${p(a + spread, R)} Z`;
  });
  return (
    <AbsoluteFill>
      <svg width={width} height={height}>
        <path d={lines.join(' ')} fill="#fff" opacity={0.85} />
      </svg>
    </AbsoluteFill>
  );
};
