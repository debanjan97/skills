import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { BeatView } from './components/BeatView';
import { CreditLine } from './components/CreditLine';
import { HookCard } from './components/HookCard';
import { Outro } from './components/Outro';
import type { Timeline } from './types';

export const Short: React.FC<{ timeline: Timeline }> = ({ timeline }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    {timeline.music ? <Audio src={staticFile(timeline.music.src)} volume={timeline.music.volume} /> : null}
    {timeline.beats.map((beat) => (
      <Sequence key={beat.id} from={beat.from} durationInFrames={beat.durationInFrames} name={beat.id}>
        <BeatView beat={beat} style={timeline.style} />
      </Sequence>
    ))}
    {/* Optional end card (outroSeconds > 0). Off by default so the Short loops cleanly. */}
    {timeline.outro.durationInFrames > 0 ? (
      <Sequence from={timeline.outro.from} durationInFrames={timeline.outro.durationInFrames} name="outro">
        <Outro {...timeline.outro} />
      </Sequence>
    ) : null}
    {timeline.creditLine ? <CreditLine text={timeline.creditLine} /> : null}
    {/* Split hook card (inknarrator style): over everything for its first frames; it is the thumbnail. */}
    {timeline.hookCard ? (
      <Sequence from={0} durationInFrames={timeline.hookCard.frames} name="hook-card">
        <HookCard {...timeline.hookCard} />
      </Sequence>
    ) : null}
  </AbsoluteFill>
);
