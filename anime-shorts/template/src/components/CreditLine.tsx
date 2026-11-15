import { AbsoluteFill } from 'remotion';
import { captionFont } from './fonts';

// The series credit, on screen for the whole Short: small and quiet, so it credits the
// author without an end card that would break the loop. Top edge, because the bottom
// fifth of a Short sits under the platform's title and channel bar.
export const CreditLine: React.FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 34 }}>
    <div
      style={{
        fontFamily: captionFont,
        fontWeight: 900,
        fontSize: 30,
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.72)',
        textShadow: '0 2px 8px rgba(0,0,0,0.9)',
      }}
    >
      {text}
    </div>
  </AbsoluteFill>
);
