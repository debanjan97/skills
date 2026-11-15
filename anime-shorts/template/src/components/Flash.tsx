import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 1, 5], [0.95, 0.9, 0], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ backgroundColor: '#fff', opacity }} />;
};
