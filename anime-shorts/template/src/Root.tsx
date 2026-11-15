import { Composition } from 'remotion';
import { Short } from './Short';
import timelineJson from './timeline.json';
import type { Timeline } from './types';

const timeline = timelineJson as Timeline;

export const Root: React.FC = () => (
  <Composition
    id="Short"
    component={Short}
    durationInFrames={timeline.durationInFrames}
    fps={timeline.fps}
    width={timeline.width}
    height={timeline.height}
    defaultProps={{ timeline }}
  />
);
