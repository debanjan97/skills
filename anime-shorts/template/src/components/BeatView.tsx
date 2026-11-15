import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import type { Beat } from '../types';
import { Captions } from './Captions';
import { Flash } from './Flash';
import { Hook } from './Hook';
import { ShotView } from './ShotView';
import { SpeedLines } from './SpeedLines';

// effect is a "+"-joined list, e.g. "punch+speedlines".
// Motion: kenburns (default) | push | punch | shake | pan
// Overlays: speedlines | flash
export const BeatView: React.FC<{ beat: Beat }> = ({ beat }) => {
  const fx = new Set(beat.effect.split('+').map((s) => s.trim()));
  return (
    <AbsoluteFill>
      {beat.shots.map((shot, i) => (
        <Sequence key={shot.src + i} from={shot.from} durationInFrames={shot.durationInFrames}>
          <ShotView shot={shot} fx={fx} />
          {fx.has('speedlines') ? <SpeedLines seed={beat.id + i} /> : null}
          {fx.has('punch') || fx.has('flash') ? <Flash /> : null}
        </Sequence>
      ))}
      <Vignette />
      {beat.hook ? <Hook text={beat.hook} /> : null}
      <Captions words={beat.words} />
      {beat.vo ? <Audio src={staticFile(beat.vo)} /> : null}
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)' }} />
);
