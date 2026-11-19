export type Word = { text: string; from: number; to: number; emphasis: boolean; color?: string };
export type Shot = { src: string; w: number; h: number; from: number; durationInFrames: number };
export type Beat = {
  id: string;
  from: number;
  durationInFrames: number;
  effect: string;
  hook: string | null;
  vo: string | null;
  voTrim: number; // frames skipped at the start of the take (leading silence on the opening beat)
  shots: Shot[];
  words: Word[];
};
export type Timeline = {
  fps: number;
  width: number;
  height: number;
  title: string;
  music: { src: string; volume: number } | null;
  beats: Beat[];
  outro: { from: number; durationInFrames: number; series: string; author: string; readOn: string };
  // 'default' (blurred backdrop, framed panel, big captions) or 'inknarrator' (full-bleed panels,
  // small mid-screen captions, split hook card on frame 0). Set by script.json "style".
  style: string;
  hookCard: { top: string; bottom: string; lines: string[]; frames: number } | null;
  creditLine: string | null;
  durationInFrames: number;
};
